// ==UserScript==
// @name         YouTube Defaulter
// @namespace    https://greasyfork.org/ru/users/901750-gooseob
// @version      1.6.8
// @description  Set speed, quality and subtitles as default globally or specialize for each channel
// @author       GooseOb
// @license      MIT
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// ==/UserScript==

(function(){
const STORAGE_NAME = 'YTDefaulter', STORAGE_VERSION = 4, SECTION_GLOBAL = 'global', SECTION_LOCAL = 'thisChannel', PREFIX = 'YTDef-', MENU_ID = PREFIX + 'menu', BTN_ID = PREFIX + 'btn', SETTING_HINT_CLASS = PREFIX + 'setting-hint', SUBTITLES = 'subtitles', SPEED = 'speed', CUSTOM_SPEED = 'customSpeed', QUALITY = 'quality', VOLUME = 'volume';
const text = {
	OPEN_SETTINGS: 'Open additional settings',
	SUBTITLES: 'Subtitles',
	SPEED: 'Speed',
	CUSTOM_SPEED: 'Custom speed',
	CUSTOM_SPEED_HINT: 'If defined, will be used instead of "speed"',
	QUALITY: 'Quality',
	VOLUME: 'Volume, %',
	GLOBAL: 'global',
	LOCAL: 'this channel',
	SHORTS: 'Open shorts as a usual video',
	NEW_TAB: 'Open videos in a new tab',
	COPY_SUBS: 'Copy subtitles by Ctrl+C in fullscreen mode',
	STANDARD_MUSIC_SPEED: 'Don\'t change speed on artist channels',
	SAVE: 'Save',
	SAVED: 'Saved',
	DEFAULT: '-'
};
const translations = {
	'be-BY': {
		OPEN_SETTINGS: 'Адкрыць дадатковыя налады',
		SUBTITLES: 'Субтытры',
		SPEED: 'Хуткасьць',
		CUSTOM_SPEED: 'Свая хуткасьць',
		CUSTOM_SPEED_HINT: 'Калі вызначана, будзе выкарыстоўвацца замест "хуткасьць"',
		QUALITY: 'Якасьць',
		VOLUME: 'Гучнасьць, %',
		GLOBAL: 'глябальна',
		LOCAL: 'гэты канал',
		SHORTS: 'Адкрываць shorts як звычайныя',
		NEW_TAB: 'Адкрываць відэа ў новай картцы',
		COPY_SUBS: 'Капіяваць субтытры ў поўнаэкранным, Ctrl+C',
		STANDARD_MUSIC_SPEED: 'Не мяняць хуткасьць на каналах музыкаў',
		SAVE: 'Захаваць',
		SAVED: 'Захавана'
	}
};
Object.assign(text, translations[document.documentElement.lang]);
const cfgLocalStorage = localStorage[STORAGE_NAME];
const cfg = cfgLocalStorage ? JSON.parse(cfgLocalStorage) : {
	_v: STORAGE_VERSION,
	global: {},
	channels: {},
	flags: {
		shortsToUsual: false,
		newTab: false,
		copySubs: false,
		standardMusicSpeed: false
	}
};
const isDescendantOrTheSame = (child, parents) => {
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
const copyObj = (obj) => Object.assign({}, obj);
const saveCfg = () => {
	const cfgCopy = copyObj(cfg);
	const channelsCfgCopy = copyObj(cfg.channels);
	for (const key in channelsCfgCopy) {
		const channelCfg = channelsCfgCopy[key];
		const { length } = Object.keys(channelCfg);
		if (!length || (length === 1 && channelCfg.subtitles === false))
			delete channelsCfgCopy[key];
	}
	cfgCopy.channels = channelsCfgCopy;
	localStorage[STORAGE_NAME] = JSON.stringify(cfgCopy);
};
if (cfg._v !== STORAGE_VERSION) {
	switch (cfg._v) {
		case 1:
			const { shortsToUsual, newTab } = cfg;
			cfg.flags = {
				shortsToUsual, newTab,
				copySubs: false
			};
			delete cfg.shortsToUsual;
			delete cfg.newTab;
			cfg._v = 2;
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
			cfg._v = STORAGE_VERSION;
	}
	saveCfg();
}
function debounce(callback, delay) {
	let timeout;
	return function (...args) {
		clearTimeout(timeout);
		timeout = window.setTimeout(() => {
			callback.apply(this, args);
		}, delay);
	};
}
const restoreFocusAfter = (cb) => {
	const el = document.activeElement;
	cb();
	el.focus();
};
const until = (getItem, check, msToWait = 10000, msReqTimeout = 20) => new Promise((res, rej) => {
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
const untilAppear = (getItem, msToWait) => until(getItem, Boolean, msToWait);
const ytSettingItems = {};
let channelCfg, channelName, isTheSameChannel = true, video, subtitlesBtn, muteBtn, ytMenu, menu, SPEED_NORMAL, isSpeedChanged = false;
const $ = (id) => document.getElementById(id);
const getChannelName = () => new URLSearchParams(location.search).get('ab_channel');
const getChannelUsername = () => (document.querySelector('span[itemprop="author"] > link[itemprop="url"]'))?.href.replace(/.*\/@/, '');
const getPlr = () => $('movie_player');
const getAboveTheFold = () => $('above-the-fold');
const getActionsBar = () => $('actions')?.querySelector('ytd-menu-renderer');
const untilChannelUsernameAppear = () => untilAppear(getChannelUsername).catch(() => '');
const isMusicChannel = async () => {
	const el = await untilAppear(getAboveTheFold);
	return !!el.querySelector('.badge-style-type-verified-artist');
};
const validateVolume = (value) => {
	const num = +value;
	if (num < 0 || num > 100)
		throw 'out of range';
	if (isNaN(num))
		throw 'not a number';
};
const getElCreator = (tag) => (props) => Object.assign(document.createElement(tag), props);
const comparators = {
	[QUALITY]: (value, current) => +value >= parseInt(current),
	[SPEED]: (value, current) => value === current
};
const logger = {
	prefix: '[YT-Defaulter]',
	err(...msgs) {
		console.error(this.prefix, ...msgs);
	},
	outOfRange(what) {
		this.err(what, 'value is out of range');
	}
};
const valueSetters = {
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
		this._ytSettingItem(isSpeedChanged ? SPEED_NORMAL : value, SPEED);
		isSpeedChanged = !isSpeedChanged;
	},
	customSpeed(value) {
		try {
			video.playbackRate = isSpeedChanged ? 1 : +value;
		}
		catch {
			return logger.outOfRange('Custom speed');
		}
		isSpeedChanged = !isSpeedChanged;
	},
	subtitles(value) {
		if (subtitlesBtn.ariaPressed !== value.toString())
			subtitlesBtn.click();
	},
	volume(value) {
		const num = +value;
		muteBtn ||= document.querySelector('.ytp-mute-button');
		const isMuted = muteBtn.dataset.titleNoTooltip !== 'Mute';
		if (num === 0) {
			if (!isMuted)
				muteBtn.click();
			return;
		}
		if (isMuted)
			muteBtn.click();
		try {
			video.volume = num / 100;
		}
		catch {
			logger.outOfRange('Volume');
		}
	},
	quality(value) {
		this._ytSettingItem(value, QUALITY);
	}
};
const updateMenuVisibility = async () => {
	const name = await untilAppear(getChannelName);
	if (menu.btn) {
		isTheSameChannel = channelName === name;
		menu.btn.style.display = isTheSameChannel ? 'flex' : 'none';
	}
	else
		channelName = name;
};
const delay = (ms) => new Promise(res => setTimeout(res, ms));
const onPageChange = async () => {
	if (location.pathname !== '/watch')
		return;
	updateMenuVisibility();
	if (!channelCfg) {
		const channelUsername = await untilChannelUsernameAppear();
		channelCfg = cfg.channels[channelUsername] ||= {};
	}
	const plr = await untilAppear(getPlr);
	await delay(1000);
	const getAd = () => plr.querySelector('.ytp-ad-player-overlay');
	if (getAd())
		await until(getAd, ad => !ad, 200000);
	ytMenu = Object.assign(plr.querySelector('.ytp-settings-menu'), {
		_btn: plr.querySelector('.ytp-settings-button'),
		isOpen() { return this.style.display !== 'none'; },
		open() { this.isOpen() || this._btn.click(); },
		close() { this.isOpen() && this._btn.click(); },
		openItem(item) {
			this.open();
			item.click();
			return Array.from(this.querySelectorAll('.ytp-panel-animate-forward .ytp-menuitem-label'));
		}
	});
	restoreFocusAfter(() => {
		ytMenu.open();
		ytMenu.close();
	});
	const getMenuItems = () => ytMenu.querySelectorAll('.ytp-menuitem[role="menuitem"]');
	const menuItemArr = Array.from(await until(getMenuItems, arr => !!arr.length));
	Object.assign(ytSettingItems, {
		quality: menuItemArr.at(-1),
		speed: menuItemArr[0]
	});
	if (!SPEED_NORMAL)
		restoreFocusAfter(() => {
			const labels = ytMenu.openItem(ytSettingItems.speed);
			for (const label of labels) {
				const text = label.textContent;
				if (!+text) {
					SPEED_NORMAL = text;
					break;
				}
			}
			ytMenu.close();
		});
	const doNotChangeSpeed = cfg.flags.standardMusicSpeed && (await isMusicChannel());
	const settings = Object.assign({}, cfg.global, isTheSameChannel && channelCfg);
	if (isTheSameChannel) {
		const isChannelSpeed = 'speed' in channelCfg;
		const isChannelCustomSpeed = 'customSpeed' in channelCfg;
		if ((doNotChangeSpeed && !isChannelCustomSpeed) || isChannelSpeed)
			delete settings.customSpeed;
		if (doNotChangeSpeed && !isChannelSpeed)
			delete settings.speed;
	}
	else if (doNotChangeSpeed) {
		delete settings.speed;
		delete settings.customSpeed;
	}
	const { customSpeed } = settings;
	delete settings.customSpeed;
	isSpeedChanged = false;
	video ||= plr.querySelector('.html5-main-video');
	subtitlesBtn ||= plr.querySelector('.ytp-subtitles-button');
	restoreFocusAfter(() => {
		for (const setting in settings)
			valueSetters[setting](settings[setting]);
	});
	if (!isNaN(+customSpeed)) {
		isSpeedChanged = false;
		valueSetters.customSpeed(customSpeed);
	}
	if (menu)
		return;
	const div = getElCreator('div'), input = getElCreator('input'), checkbox = (props) => input({ type: 'checkbox', ...props }), option = getElCreator('option'), _label = getElCreator('label'), labelEl = (forId, props) => {
		const elem = _label(props);
		elem.setAttribute('for', forId);
		return elem;
	}, selectEl = getElCreator('select'), btnClass = 'yt-spec-button-shape-next', _button = getElCreator('button'), button = (text, props) => _button(Object.assign({
		textContent: text,
		className: `${btnClass} ${btnClass}--tonal ${btnClass}--mono ${btnClass}--size-m`,
		onfocus() { this.classList.add(btnClass + '--focused'); },
		onblur() { this.classList.remove(btnClass + '--focused'); }
	}, props));
	menu = div({
		id: MENU_ID,
		isOpen: false,
		width: 0,
		closeListener: {
			onClick(e) {
				const el = e.target;
				if (isDescendantOrTheSame(el, [menu, menu.btn]))
					return;
				menu.toggle();
			},
			onKeyUp(e) {
				if (e.code !== 'Escape')
					return;
				menu._close();
				menu.btn.focus();
			},
			add() {
				document.addEventListener('click', this.onClick);
				document.addEventListener('keyup', this.onKeyUp);
			},
			remove() {
				document.removeEventListener('click', this.onClick);
				document.removeEventListener('keyup', this.onKeyUp);
			},
		},
		_open() {
			this.fixPosition();
			this.style.visibility = 'visible';
			this.closeListener.add();
			this.querySelector('select').focus();
			this.isOpen = true;
		},
		_close() {
			this.style.visibility = 'hidden';
			this.closeListener.remove();
			this.isOpen = false;
		},
		toggle: debounce(function () {
			if (this.isOpen)
				this._close();
			else
				this._open();
		}, 100),
		fixPosition() {
			const { y, height, width, left } = this.btn.getBoundingClientRect();
			this.style.top = y + height + 8 + 'px';
			this.style.left = left + width - this.width + 'px';
		},
		btn: button('', {
			id: BTN_ID,
			ariaLabel: text.OPEN_SETTINGS,
			tabIndex: 0,
			onclick() { menu.toggle(); }
		})
	});
	const createSection = (sectionId, title, sectionCfg) => {
		const section = div({ role: 'group' });
		section.setAttribute('aria-labelledby', sectionId);
		const getLocalId = (name) => PREFIX + name + '-' + sectionId;
		const addItem = (name, innerHTML, elem) => {
			const item = div();
			const id = getLocalId(name);
			const label = labelEl(id, { innerHTML });
			const valueProp = elem.type === 'checkbox' ? 'checked' : 'value';
			Object.assign(elem, {
				id,
				name: name,
				onchange() {
					const value = this[valueProp];
					if (value === '' || value === text.DEFAULT)
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
		const toOptions = (values, getText) => [option({
				value: text.DEFAULT,
				textContent: text.DEFAULT
			})].concat(values.map(value => option({
			value: value,
			textContent: getText(value)
		})));
		const speedValues = ['2', '1.75', '1.5', '1.25', SPEED_NORMAL, '0.75', '0.5', '0.25'];
		const qualityValues = ['144', '240', '360', '480', '720', '1080', '1440', '2160', '4320'];
		const addSelectItem = (name, label, options, getText) => addItem(name, label, selectEl({ value: text.DEFAULT }))
			.elem.append(...toOptions(options, getText));
		section.append(getElCreator('span')({ textContent: title, id: sectionId }));
		const createHint = (prefix, props) => {
			const el = div({
				className: SETTING_HINT_CLASS,
				hide() { this.style.display = 'none'; },
				show(msg) {
					this.style.display = 'block';
					if (msg)
						this.textContent = prefix + msg;
				},
				...props
			});
			el.hide();
			return el;
		};
		addSelectItem(SPEED, text.SPEED, speedValues, val => val);
		addItem(CUSTOM_SPEED, text.CUSTOM_SPEED, input({
			type: 'number',
			onfocus() { this.hint.show(); },
			onblur() { this.hint.hide(); },
			hint: createHint(null, { textContent: text.CUSTOM_SPEED_HINT })
		}));
		addSelectItem(QUALITY, text.QUALITY, qualityValues, val => val + 'p');
		addItem(VOLUME, text.VOLUME, input({
			type: 'number',
			min: '0', max: '100',
			oninput() {
				settings.volume = this.value;
				try {
					validateVolume(this.value);
					this.hint.hide();
				}
				catch (e) {
					this.hint.show(e);
				}
			},
			hint: createHint('Warning: ')
		}));
		addItem(SUBTITLES, text.SUBTITLES, checkbox());
		return section;
	};
	const sections = div({ className: PREFIX + 'sections' });
	sections.append(createSection(SECTION_GLOBAL, text.GLOBAL, cfg.global), createSection(SECTION_LOCAL, text.LOCAL, channelCfg));
	const checkboxDiv = (id, prop, text) => {
		const cont = div({ className: 'check-cont' });
		id = PREFIX + id;
		cont.append(labelEl(id, { textContent: text }), checkbox({
			id,
			checked: cfg.flags[prop],
			onclick() { cfg.flags[prop] = this.checked; }
		}));
		return cont;
	};
	menu.append(sections, checkboxDiv('shorts', 'shortsToUsual', text.SHORTS), checkboxDiv('new-tab', 'newTab', text.NEW_TAB), checkboxDiv('copy-subs', 'copySubs', text.COPY_SUBS), checkboxDiv('standard-music-speed', 'standardMusicSpeed', text.STANDARD_MUSIC_SPEED), button(text.SAVE, {
		setTextDefer: debounce(function (text) {
			this.textContent = text;
		}, 1000),
		onclick() {
			saveCfg();
			this.textContent = text.SAVED;
			this.setTextDefer(text.SAVE);
		}
	}));
	menu.addEventListener('keyup', e => {
		const el = e.target;
		if (e.code === 'Enter' && el.type === 'checkbox')
			el.checked = !el.checked;
	});
	const settingsIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	const iconStyle = {
		viewBox: '0 0 24 24',
		width: '24', height: '24',
		fill: 'var(--yt-spec-text-primary)'
	};
	for (const key in iconStyle)
		settingsIcon.setAttribute(key, iconStyle[key]);
	settingsIcon.append($('settings'));
	menu.btn.setAttribute('aria-controls', MENU_ID);
	menu.btn.classList.add(btnClass + '--icon-button');
	menu.btn.append(settingsIcon);
	const actionsBar = await untilAppear(getActionsBar);
	actionsBar.insertBefore(menu.btn, actionsBar.lastChild);
	document.querySelector('ytd-popup-container').append(menu);
	menu.width = menu.getBoundingClientRect().width;
	sections.style.maxWidth = sections.offsetWidth + 'px';
};
let lastHref;
setInterval(() => {
	if (lastHref === location.href)
		return;
	lastHref = location.href;
	onPageChange();
}, 1000);
const onClick = (e) => {
	const { shortsToUsual, newTab } = cfg.flags;
	if (!shortsToUsual && !newTab)
		return;
	let el = e.target;
	if (el.tagName !== 'A') {
		el = el.closest('a');
		if (!el)
			return;
	}
	if (!/shorts\/|watch\?v=/.test(el.href))
		return;
	if (shortsToUsual)
		el.href = el.href.replace('shorts/', 'watch?v=');
	if (newTab) {
		el.target = '_blank';
		e.stopPropagation();
	}
};
document.addEventListener('click', onClick, { capture: true });
document.addEventListener('keyup', e => {
	if (e.code === 'Enter')
		return onClick(e);
	if (!e.ctrlKey)
		return;
	if (cfg.flags.copySubs && e.code === 'KeyC') {
		const plr = document.querySelector('.html5-video-player');
		if (!plr?.classList.contains('ytp-fullscreen'))
			return;
		const text = Array.from(plr.querySelectorAll('.captions-text > span')).map(line => line.textContent).join(' ');
		navigator.clipboard.writeText(text);
		return;
	}
	if (e.code !== 'Space')
		return;
	e.stopPropagation();
	e.preventDefault();
	let setting;
	if (e.shiftKey) {
		setting = QUALITY;
	}
	else {
		const value = (isTheSameChannel && channelCfg)
			? channelCfg.customSpeed || (!channelCfg.speed && cfg.global.customSpeed)
			: cfg.global.customSpeed;
		if (value)
			return valueSetters.customSpeed(value);
		setting = SPEED;
	}
	restoreFocusAfter(() => {
		valueSetters[setting]((isTheSameChannel && channelCfg || cfg.global)[setting]);
	});
});
const listener = () => {
	if (menu?.isOpen)
		menu.fixPosition();
};
window.addEventListener('scroll', listener);
window.addEventListener('resize', listener);
const m = '#' + MENU_ID, d = ' div', i = ' input', s = ' select', bg = 'var(--yt-spec-menu-background)', underline = 'border-bottom: 2px solid var(--yt-spec-text-primary);';
document.head.append(getElCreator('style')({ textContent: `
#${BTN_ID} {position: relative; margin-left: 8px}
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
${m} .${SETTING_HINT_CLASS} {margin: 0; text-align: end}
${m + i} {outline: none}
${m + d + d + d}:focus-within > label, ${m} .check-cont:focus-within > label {${underline}}
${m} .check-cont {padding: 0 1rem}
${m + s} {appearance: none; outline: none}
${m} label {margin-right: 1.5rem; white-space: nowrap}
${m + i}::-webkit-outer-spin-button,
${m + i}::-webkit-inner-spin-button {-webkit-appearance: none; margin: 0}
${m + i}[type=number] {-moz-appearance: textfield}
${m + s}::-ms-expand {display: none}` }));
})();