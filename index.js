// ==UserScript==
// @name         YouTube Defaulter
// @namespace    https://greasyfork.org/ru/users/901750-gooseob
// @version      1.6.18
// @description  Set speed, quality, subtitles and volume as default globally or specialize for each channel
// @author       GooseOb
// @license      MIT
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// ==/UserScript==

(function(){// index.ts
var debounce = function(callback, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      callback.apply(this, args);
    }, delay);
  };
};
var translations = {
  "be-BY": {
    OPEN_SETTINGS: "Адкрыць дадатковыя налады",
    SUBTITLES: "Субтытры",
    SPEED: "Хуткасьць",
    CUSTOM_SPEED: "Свая хуткасьць",
    CUSTOM_SPEED_HINT: 'Калі вызначана, будзе выкарыстоўвацца замест "хуткасьць"',
    QUALITY: "Якасьць",
    VOLUME: "Гучнасьць, %",
    GLOBAL: "глябальна",
    LOCAL: "гэты канал",
    SHORTS: "Адкрываць shorts як звычайныя",
    NEW_TAB: "Адкрываць відэа ў новай картцы",
    COPY_SUBS: "Капіяваць субтытры ў поўнаэкранным, Ctrl+C",
    STANDARD_MUSIC_SPEED: "Звычайная хуткасьць на каналах музыкаў",
    SAVE: "Захаваць",
    SAVED: "Захавана"
  }
};
var text = {
  OPEN_SETTINGS: "Open additional settings",
  SUBTITLES: "Subtitles",
  SPEED: "Speed",
  CUSTOM_SPEED: "Custom speed",
  CUSTOM_SPEED_HINT: 'If defined, will be used instead of "speed"',
  QUALITY: "Quality",
  VOLUME: "Volume, %",
  GLOBAL: "global",
  LOCAL: "this channel",
  SHORTS: "Open shorts as a usual video",
  NEW_TAB: "Open videos in a new tab",
  COPY_SUBS: "Copy subtitles by Ctrl+C in fullscreen mode",
  STANDARD_MUSIC_SPEED: "Normal speed on artist channels",
  SAVE: "Save",
  SAVED: "Saved",
  DEFAULT: "-",
  ...translations[document.documentElement.lang]
};
var cfgLocalStorage = localStorage["YTDefaulter"];
var cfg = cfgLocalStorage ? JSON.parse(cfgLocalStorage) : {
  _v: 4,
  global: {},
  channels: {},
  flags: {
    shortsToUsual: false,
    newTab: false,
    copySubs: false,
    standardMusicSpeed: false
  }
};
var isDescendantOrTheSame = (child, parents) => {
  if (parents.includes(child))
    return true;
  let node = child.parentNode;
  while (node !== null) {
    if (parents.includes(node))
      return true;
    node = node.parentNode;
  }
  return false;
};
var saveCfg = () => {
  const cfgCopy = { ...cfg };
  const channelsCfgCopy = { ...cfg.channels };
  outer:
    for (const key in channelsCfgCopy) {
      const channelCfg = channelsCfgCopy[key];
      if (channelCfg.subtitles)
        continue;
      for (const cfgKey in channelCfg)
        if (cfgKey !== "subtitles")
          continue outer;
      delete channelsCfgCopy[key];
    }
  cfgCopy.channels = channelsCfgCopy;
  localStorage["YTDefaulter"] = JSON.stringify(cfgCopy);
};
if (cfg._v !== 4) {
  switch (cfg._v) {
    case 2:
      cfg.flags.standardMusicSpeed = false;
      cfg._v = 3;
    case 3:
      cfg.global.quality = cfg.global.qualityMax;
      delete cfg.global.qualityMax;
      for (const key in cfg.channels) {
        const currCfg = cfg.channels[key];
        currCfg.quality = currCfg.qualityMax;
        delete currCfg.qualityMax;
      }
      cfg._v = 4;
  }
  saveCfg();
}
var restoreFocusAfter = (cb) => {
  const el = document.activeElement;
  cb();
  el.focus();
};
var until = (getItem, check, msToWait = 1e4, msReqTimeout = 20) => new Promise((res, rej) => {
  const reqLimit = msToWait / msReqTimeout;
  let i = 0;
  const interval = setInterval(() => {
    if (i++ > reqLimit)
      exit(rej);
    const item = getItem();
    if (!check(item))
      return;
    exit(() => res(item));
  }, msReqTimeout);
  const exit = (cb) => {
    clearInterval(interval);
    cb();
  };
});
var untilAppear = (getItem, msToWait) => until(getItem, Boolean, msToWait);
var ytSettingItems = {};
var channelCfg;
var channelName;
var isTheSameChannel = true;
var video;
var subtitlesBtn;
var muteBtn;
var SPEED_NORMAL;
var isSpeedChanged = false;
var menu = {
  element: null,
  isOpen: false,
  width: 0,
  _closeListener: {
    onClick(e) {
      const el = e.target;
      if (isDescendantOrTheSame(el, [menu.element, menu.btn]))
        return;
      menu.toggle();
    },
    onKeyUp(e) {
      if (e.code !== "Escape")
        return;
      menu._close();
      menu.btn.focus();
    },
    add() {
      document.addEventListener("click", this.onClick);
      document.addEventListener("keyup", this.onKeyUp);
    },
    remove() {
      document.removeEventListener("click", this.onClick);
      document.removeEventListener("keyup", this.onKeyUp);
    }
  },
  firstElement: null,
  _open() {
    this.fixPosition();
    this.element.style.visibility = "visible";
    this._closeListener.add();
    this.firstElement.focus();
    this.isOpen = true;
  },
  _close() {
    this.style.visibility = "hidden";
    this._closeListener.remove();
    this.isOpen = false;
  },
  toggle: debounce(function() {
    if (this.isOpen)
      this._close();
    else
      this._open();
  }, 100),
  fixPosition() {
    const { y, height, width, left } = this.btn.getBoundingClientRect();
    this.style.top = y + height + 8 + "px";
    this.style.left = left + width - this.width + "px";
  },
  btn: null
};
var $ = (id) => document.getElementById(id);
var getChannelName = () => new URLSearchParams(location.search).get("ab_channel");
var getChannelUsername = () => document.querySelector('span[itemprop="author"] > link[itemprop="url"]')?.href.replace(/.*\/@/, "");
var getPlr = () => $("movie_player");
var getAboveTheFold = () => $("above-the-fold");
var getActionsBar = () => $("actions")?.querySelector("ytd-menu-renderer");
var iconD = {
  ["quality"]: "M15,17h6v1h-6V17z M11,17H3v1h8v2h1v-2v-1v-2h-1V17z M14,8h1V6V5V3h-1v2H3v1h11V8z            M18,5v1h3V5H18z M6,14h1v-2v-1V9H6v2H3v1 h3V14z M10,12h11v-1H10V12z",
  ["speed"]: "M10,8v8l6-4L10,8L10,8z M6.3,5L5.7,4.2C7.2,3,9,2.2,11,2l0.1,1C9.3,3.2,7.7,3.9,6.3,5z            M5,6.3L4.2,5.7C3,7.2,2.2,9,2,11 l1,.1C3.2,9.3,3.9,7.7,5,6.3z            M5,17.7c-1.1-1.4-1.8-3.1-2-4.8L2,13c0.2,2,1,3.8,2.2,5.4L5,17.7z            M11.1,21c-1.8-0.2-3.4-0.9-4.8-2 l-0.6,.8C7.2,21,9,21.8,11,22L11.1,21z            M22,12c0-5.2-3.9-9.4-9-10l-0.1,1c4.6,.5,8.1,4.3,8.1,9s-3.5,8.5-8.1,9l0.1,1 C18.2,21.5,22,17.2,22,12z"
};
var getYtElementFinderInArray = (elems) => (name) => elems.find((el) => el.querySelector(`path[d="${iconD[name]}"]`));
var untilChannelUsernameAppear = () => untilAppear(getChannelUsername).catch(() => "");
var isMusicChannel = () => untilAppear(getAboveTheFold).then((el) => !!el.querySelector(".badge-style-type-verified-artist"));
var ytMenu = {
  updatePlayer(plr) {
    this.element = plr.querySelector(".ytp-settings-menu");
    this._btn = plr.querySelector(".ytp-settings-button");
    restoreFocusAfter(() => {
      this._btn.click();
      this._btn.click();
    });
  },
  element: null,
  _btn: null,
  _isOpen() {
    return this.element.style.display !== "none";
  },
  open() {
    if (!this._isOpen())
      this._btn.click();
  },
  close() {
    if (this._isOpen())
      this._btn.click();
  },
  openItem(item) {
    this.open();
    item.click();
    return this.element.querySelectorAll(".ytp-panel-animate-forward .ytp-menuitem-label");
  }
};
var validateVolume = (value) => {
  const num = +value;
  return num < 0 || num > 100 ? "out of range" : isNaN(num) ? "not a number" : false;
};
var getElCreator = (tag) => (props) => Object.assign(document.createElement(tag), props);
var comparators = {
  ["quality"]: (value, current) => +value >= parseInt(current),
  ["speed"]: (value, current) => value === current
};
var logger = {
  prefix: "[YT-Defaulter]",
  err(...msgs) {
    console.error(this.prefix, ...msgs);
  },
  outOfRange(what) {
    this.err(what, "value is out of range");
  }
};
var valueSetters = {
  _ytSettingItem(value, settingName) {
    const compare = comparators[settingName];
    for (const btn of ytMenu.openItem(ytSettingItems[settingName]))
      if (compare(value, btn.textContent)) {
        btn.click();
        break;
      }
    ytMenu.close();
  },
  speed(value) {
    this._ytSettingItem(isSpeedChanged ? SPEED_NORMAL : value, "speed");
    isSpeedChanged = !isSpeedChanged;
  },
  customSpeed(value) {
    try {
      video.playbackRate = isSpeedChanged ? 1 : +value;
    } catch {
      logger.outOfRange("Custom speed");
      return;
    }
    isSpeedChanged = !isSpeedChanged;
  },
  subtitles(value) {
    if (subtitlesBtn.ariaPressed !== value.toString())
      subtitlesBtn.click();
  },
  volume(value) {
    const num = +value;
    muteBtn ||= document.querySelector(".ytp-mute-button");
    const isMuted = muteBtn.dataset.titleNoTooltip !== "Mute";
    if (num === 0) {
      if (!isMuted)
        muteBtn.click();
      return;
    }
    if (isMuted)
      muteBtn.click();
    try {
      video.volume = num / 100;
    } catch {
      logger.outOfRange("Volume");
    }
  },
  quality(value) {
    this._ytSettingItem(value, "quality");
  }
};
var updateMenuVisibility = async () => {
  const name = await untilAppear(getChannelName);
  if (menu.btn) {
    isTheSameChannel = channelName === name;
    menu.btn.style.display = isTheSameChannel ? "flex" : "none";
  } else {
    channelName = name;
  }
};
var delay = (ms) => new Promise((res) => setTimeout(res, ms));
var onPageChange = async () => {
  if (location.pathname !== "/watch")
    return;
  await updateMenuVisibility();
  if (!channelCfg) {
    const channelUsername = await untilChannelUsernameAppear();
    channelCfg = cfg.channels[channelUsername] ||= {};
  }
  const plr = await untilAppear(getPlr);
  await delay(1000);
  const getAd = () => plr.querySelector(".ytp-ad-player-overlay");
  if (getAd())
    await until(getAd, (ad) => !ad, 200000);
  ytMenu.updatePlayer(plr);
  const getMenuItems = () => ytMenu.element.querySelectorAll('.ytp-menuitem[role="menuitem"]');
  const menuItemArr = Array.from(await until(getMenuItems, (arr) => !!arr.length));
  const getYtElement = getYtElementFinderInArray(menuItemArr);
  Object.assign(ytSettingItems, {
    quality: getYtElement("quality"),
    speed: getYtElement("speed")
  });
  if (!SPEED_NORMAL)
    restoreFocusAfter(() => {
      for (const { textContent } of ytMenu.openItem(ytSettingItems.speed))
        if (!+textContent) {
          SPEED_NORMAL = textContent;
          break;
        }
    });
  const doNotChangeSpeed = cfg.flags.standardMusicSpeed && await isMusicChannel();
  const settings = {
    ...cfg.global,
    ...isTheSameChannel && channelCfg
  };
  if (isTheSameChannel) {
    const isChannelSpeed = "speed" in channelCfg;
    const isChannelCustomSpeed = "customSpeed" in channelCfg;
    if (doNotChangeSpeed && !isChannelCustomSpeed || isChannelSpeed)
      delete settings.customSpeed;
    if (doNotChangeSpeed && !isChannelSpeed)
      settings.speed = SPEED_NORMAL;
  } else if (doNotChangeSpeed) {
    settings.speed = SPEED_NORMAL;
    delete settings.customSpeed;
  }
  const { customSpeed } = settings;
  delete settings.customSpeed;
  isSpeedChanged = false;
  video ||= plr.querySelector(".html5-main-video");
  subtitlesBtn ||= plr.querySelector(".ytp-subtitles-button");
  restoreFocusAfter(() => {
    for (const setting in settings)
      valueSetters[setting](settings[setting]);
    if (!isNaN(+customSpeed)) {
      isSpeedChanged = false;
      valueSetters.customSpeed(customSpeed);
    }
    ytMenu.close();
  });
  if (menu.element)
    return;
  const div = getElCreator("div"), input = getElCreator("input"), checkbox = (props) => input({ type: "checkbox", ...props }), option = getElCreator("option"), _label = getElCreator("label"), labelEl = (forId, props) => {
    const elem = _label(props);
    elem.setAttribute("for", forId);
    return elem;
  }, selectEl = getElCreator("select"), btnClass = "yt-spec-button-shape-next", _button = getElCreator("button"), button = (text2, props) => _button({
    textContent: text2,
    className: `${btnClass} ${btnClass}--tonal ${btnClass}--mono ${btnClass}--size-m`,
    onfocus() {
      this.classList.add(btnClass + "--focused");
    },
    onblur() {
      this.classList.remove(btnClass + "--focused");
    },
    ...props
  });
  menu.element = div({
    id: "YTDef-menu"
  });
  menu.btn = button("", {
    id: "YTDef-btn",
    ariaLabel: text.OPEN_SETTINGS,
    tabIndex: 0,
    onclick() {
      menu.toggle();
    }
  });
  const toOptions = (values, getText) => [
    option({
      value: text.DEFAULT,
      textContent: text.DEFAULT
    })
  ].concat(values.map((value) => option({
    value,
    textContent: getText(value)
  })));
  const speedValues = [
    "2",
    "1.75",
    "1.5",
    "1.25",
    SPEED_NORMAL,
    "0.75",
    "0.5",
    "0.25"
  ];
  const qualityValues = [
    "144",
    "240",
    "360",
    "480",
    "720",
    "1080",
    "1440",
    "2160",
    "4320"
  ];
  const createSection = (sectionId, title, sectionCfg) => {
    const section = div({ role: "group" });
    section.setAttribute("aria-labelledby", sectionId);
    const getLocalId = (name) => "YTDef-" + name + "-" + sectionId;
    const addItem = (name, innerHTML, elem) => {
      const item = div();
      const id = getLocalId(name);
      const label = labelEl(id, { innerHTML });
      const valueProp = elem.type === "checkbox" ? "checked" : "value";
      Object.assign(elem, {
        id,
        name,
        onchange() {
          const value = this[valueProp];
          if (value === "" || value === text.DEFAULT)
            delete sectionCfg[name];
          else
            sectionCfg[name] = value;
        }
      });
      const cfgValue = sectionCfg[name];
      if (cfgValue)
        setTimeout(() => {
          elem[valueProp] = cfgValue;
        });
      item.append(label, elem);
      section.append(item);
      if (elem.hint)
        section.append(elem.hint);
      return { elem };
    };
    const addSelectItem = (name, label, options, getText) => {
      const { elem } = addItem(name, label, selectEl({ value: text.DEFAULT }));
      elem.append(...toOptions(options, getText));
      return elem;
    };
    section.append(getElCreator("span")({ textContent: title, id: sectionId }));
    const createHint = (prefix, props) => {
      const el = div({
        className: "YTDef-setting-hint",
        hide() {
          this.style.display = "none";
        },
        show(msg) {
          this.style.display = "block";
          if (msg)
            this.textContent = prefix + msg;
        },
        ...props
      });
      el.hide();
      return el;
    };
    const firstElement = addSelectItem("speed", text.SPEED, speedValues, (val) => val);
    if (sectionId === "global")
      menu.firstElement = firstElement;
    addItem("customSpeed", text.CUSTOM_SPEED, input({
      type: "number",
      onfocus() {
        this.hint.show();
      },
      onblur() {
        this.hint.hide();
      },
      hint: createHint(null, { textContent: text.CUSTOM_SPEED_HINT })
    }));
    addSelectItem("quality", text.QUALITY, qualityValues, (val) => val + "p");
    addItem("volume", text.VOLUME, input({
      type: "number",
      min: "0",
      max: "100",
      oninput() {
        settings.volume = this.value;
        const warning = validateVolume(this.value);
        if (warning) {
          this.hint.show(warning);
        } else {
          this.hint.hide();
        }
      },
      hint: createHint("Warning: ")
    }));
    addItem("subtitles", text.SUBTITLES, checkbox());
    return section;
  };
  const sections = div({ className: "YTDef-sections" });
  sections.append(createSection("global", text.GLOBAL, cfg.global), createSection("thisChannel", text.LOCAL, channelCfg));
  const checkboxDiv = (id, prop, text2) => {
    const cont = div({ className: "check-cont" });
    id = "YTDef-" + id;
    cont.append(labelEl(id, { textContent: text2 }), checkbox({
      id,
      checked: cfg.flags[prop],
      onclick() {
        cfg.flags[prop] = this.checked;
      }
    }));
    return cont;
  };
  menu.element.append(sections, checkboxDiv("shorts", "shortsToUsual", text.SHORTS), checkboxDiv("new-tab", "newTab", text.NEW_TAB), checkboxDiv("copy-subs", "copySubs", text.COPY_SUBS), checkboxDiv("standard-music-speed", "standardMusicSpeed", text.STANDARD_MUSIC_SPEED), button(text.SAVE, {
    setTextDefer: debounce(function(text2) {
      this.textContent = text2;
    }, 1000),
    onclick() {
      saveCfg();
      this.textContent = text.SAVED;
      this.setTextDefer(text.SAVE);
    }
  }));
  menu.element.addEventListener("keyup", (e) => {
    const el = e.target;
    if (e.code === "Enter" && el.type === "checkbox")
      el.checked = !el.checked;
  });
  const settingsIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const iconStyle = {
    viewBox: "0 0 24 24",
    width: "24",
    height: "24",
    fill: "var(--yt-spec-text-primary)"
  };
  for (const key in iconStyle)
    settingsIcon.setAttribute(key, iconStyle[key]);
  settingsIcon.append($("settings"));
  menu.btn.setAttribute("aria-controls", "YTDef-menu");
  menu.btn.classList.add(btnClass + "--icon-button");
  menu.btn.append(settingsIcon);
  const actionsBar = await untilAppear(getActionsBar);
  actionsBar.insertBefore(menu.btn, actionsBar.lastChild);
  document.querySelector("ytd-popup-container").append(menu.element);
  menu.width = menu.element.getBoundingClientRect().width;
  sections.style.maxWidth = sections.offsetWidth + "px";
};
var lastHref;
setInterval(() => {
  if (lastHref === location.href)
    return;
  lastHref = location.href;
  onPageChange();
}, 1000);
var onClick = (e) => {
  const { shortsToUsual, newTab } = cfg.flags;
  if (!shortsToUsual && !newTab)
    return;
  let el = e.target;
  if (el.tagName !== "A") {
    el = el.closest("a");
    if (!el)
      return;
  }
  if (!/shorts\/|watch\?v=/.test(el.href))
    return;
  if (shortsToUsual)
    el.href = el.href.replace("shorts/", "watch?v=");
  if (newTab) {
    el.target = "_blank";
    e.stopPropagation();
  }
};
document.addEventListener("click", onClick, { capture: true });
document.addEventListener("keyup", (e) => {
  if (e.code === "Enter")
    return onClick(e);
  if (!e.ctrlKey)
    return;
  if (cfg.flags.copySubs && e.code === "KeyC") {
    const plr = document.querySelector(".html5-video-player");
    if (!plr?.classList.contains("ytp-fullscreen"))
      return;
    const text2 = Array.from(plr.querySelectorAll(".captions-text > span"), (line) => line.textContent).join(" ");
    navigator.clipboard.writeText(text2);
    return;
  }
  if (e.code !== "Space")
    return;
  e.stopPropagation();
  e.preventDefault();
  let setting;
  if (e.shiftKey) {
    setting = "quality";
  } else {
    const value = isTheSameChannel && channelCfg ? channelCfg.customSpeed || !channelCfg.speed && cfg.global.customSpeed : cfg.global.customSpeed;
    if (value)
      return valueSetters.customSpeed(value);
    setting = "speed";
  }
  restoreFocusAfter(() => {
    valueSetters[setting]((isTheSameChannel && channelCfg || cfg.global)[setting]);
  });
}, { capture: true });
var listener = () => {
  if (menu.isOpen)
    menu.fixPosition();
};
window.addEventListener("scroll", listener);
window.addEventListener("resize", listener);
var m = "#YTDef-menu";
var d = " div";
var i = " input";
var s = " select";
var bg = "var(--yt-spec-menu-background)";
var underline = "border-bottom: 2px solid var(--yt-spec-text-primary);";
document.head.append(getElCreator("style")({
  textContent: `
#YTDef-btn {position: relative; margin-left: 8px}
${m} {
display: flex;
visibility: hidden;
color: var(--yt-spec-text-primary);
font-size: 14px;
flex-direction: column;
position: fixed;
background: ${bg};
border-radius: 2rem;
padding: 1rem;
text-align: center;
box-shadow: 0px 4px 32px 0px var(--yt-spec-static-overlay-background-light);
z-index: 2202
}
${m + d} {display: flex; margin-bottom: 1rem}
${m + d + d} {
flex-direction: column;
margin: 0 2rem
}
${m + d + d + d} {
flex-direction: row;
margin: 1rem 0
}
${m + s}, ${m + i} {
text-align: center;
background: ${bg};
border: none;
${underline}
color: inherit;
width: 5rem;
padding: 0;
margin-left: auto
}
${m} .YTDef-setting-hint {margin: 0; text-align: end}
${m + i} {outline: none}
${m + d + d + d}:focus-within > label, ${m} .check-cont:focus-within > label {${underline}}
${m} .check-cont {padding: 0 1rem}
${m + s} {appearance: none; outline: none}
${m} label {margin-right: 1.5rem; white-space: nowrap}
${m + i}::-webkit-outer-spin-button,
${m + i}::-webkit-inner-spin-button {-webkit-appearance: none; margin: 0}
${m + i}[type=number] {-moz-appearance: textfield}
${m + s}::-ms-expand {display: none}`
}));
})()