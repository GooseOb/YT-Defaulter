// ==UserScript==
// @name         YouTube Defaulter
// @namespace    https://greasyfork.org/ru/users/901750-gooseob
// @version      1.5.1
// @description  Set speed, quality and subtitles as default globally or specialize for each channel
// @author       GooseOb
// @license      MIT
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// ==/UserScript==

(function() {
const
	STORAGE_NAME = 'YTDefaulter',
	STORAGE_VERSION = 3,
	PREFIX = 'YTDef-',
	CONT_ID = PREFIX + 'cont',
	MENU_ID = PREFIX + 'menu',
	BTN_ID = PREFIX + 'btn',
	SUBTITLES = 'subtitles',
	SPEED = 'speed',
	QUALITY = 'qualityMax',
	GLOBAL = 'global',
	LOCAL = 'thisChannel';
const text = {
	SUBTITLES: 'Subtitles',
	SPEED: 'Speed',
	QUALITY: 'Quality',
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
		SUBTITLES: 'Субтытры',
		SPEED: 'Хуткасьць',
		QUALITY: 'Якасьць',
		GLOBAL: 'глябальна',
		LOCAL: 'гэты канал',
		SHORTS: 'Адкрываць shorts як звычайныя',
		NEW_TAB: 'Адкрываць відэа ў новай картцы',
		COPY_SUBS: 'Капіяваць субтытры ў поўнаэкранным, Ctrl+C',
		STANDARD_MUSIC_SPEED: 'Не мяняць хуткасьць на каналах музыкаў',
		SAVE: 'Захаваць',
		SAVED: 'Захавана',
		DEFAULT: '-'
	}
};
Object.assign(text, translations[document.documentElement.lang] || (() => {
	for (const lang of navigator.languages)
		if (lang in translations) return translations[lang];
})());

let cfg = localStorage[STORAGE_NAME];
cfg = cfg ? JSON.parse(cfg) : {
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
const copyObj = obj => Object.assign({}, obj);
const saveCfg = () => {
	const cfgCopy = copyObj(cfg);
	const channelsCfgCopy = copyObj(cfg.channels);
	for (const key in channelsCfgCopy) {
		const channelCfg = channelsCfgCopy[key];
		const {length} = Object.keys(channelCfg);
		if (!length || (length === 1 && channelCfg.subtitles === false))
			delete channelsCfgCopy[key];
	}
	cfgCopy.channels = channelsCfgCopy;

	localStorage[STORAGE_NAME] = JSON.stringify(cfgCopy);
};

if (cfg._v !== STORAGE_VERSION)  {
	switch (cfg._v) {
		case 1:
			const {shortsToUsual, newTab} = cfg;
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
	}
	saveCfg();
}

function debounce(callback, delay) {
	let timeout;
	return function(...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			callback.apply(this, args);
		}, delay);
	};
}

const until = (
	getItem,
	check,
	msToWait = 10_000,
	msReqDelay = 20
) => new Promise((res, rej) => {
	const reqLimit = msToWait / msReqDelay;
	let i = 0;
	const interval = setInterval(() => {
		if (i++ > reqLimit) exit(rej);
		const item = getItem();
		if (!check(item)) return;
		exit(() => res(item));
	}, msReqDelay);
	const exit = cb => {
		clearInterval(interval);
		cb();
	};
});

const untilAppear = (getItem, msToWait) =>
	until(getItem, Boolean, msToWait);

let channelCfg, channelName;
let isTheSameChannel = true;

const getChannelName = () => new URLSearchParams(location.search).get('ab_channel');
const validateChannelId = id => id?.includes('/') ? null : id;
const getChannelId = () => validateChannelId(
	document.querySelector('meta[itemprop="channelId"]')
		?.content
	|| document.querySelector('.ytp-ce-channel-title.ytp-ce-link')
		?.pathname.replace('/channel/', '')
	|| document.querySelector('a#author-text')
		?.href.replace(/.*\/channel\//, '')
);
const getChannelUrlName = () => document.querySelector('link[itemprop="url"]')
	?.href.replace(/.*\/@/, '');

const untilChannelIdAppear = () => untilAppear(getChannelId, 1_000)
	.catch(() => untilAppear(getChannelUrlName))
	.catch(() => '');

const $ = id => document.getElementById(id);

const getPlr = () => $('movie_player');
const getAboveTheFold = () => $('above-the-fold');
const getActionsBar = () =>
	$('actions')?.querySelector('ytd-menu-renderer');

const isMusicChannel = () => untilAppear(getAboveTheFold).then(
	el => !!el.querySelector('.badge-style-type-verified-artist')
);

const
	addValueSetter = (el, setValue) => Object.assign(el, {setValue}),
	el = (tag, props) => Object.assign(document.createElement(tag), props);
let ytMenu, ytSettingItems, SPEED_NORMAL, menuCont;
let isSpeedChanged = false;
const comparators = {
	[QUALITY]: (value, current) => value >= parseInt(current),
	default: (value, current) => value === current
};
function setValue(value, setting) {
	const compare = comparators[setting] || comparators.default;

	for (const btn of ytMenu.openItem(this))
		if (compare(value, btn.textContent)) {
			btn.click();
			break;
		}

	ytMenu.close();
}
function setSpeedValue(value, setting) {
	setValue.apply(this, [isSpeedChanged ? SPEED_NORMAL : value, setting]);
	isSpeedChanged = !isSpeedChanged;
}
function setSubtitlesValue(value) {
	if (this.ariaPressed !== value.toString()) this.click();
}
const valueProps = {
	[SPEED]: 'value', // select
	[QUALITY]: 'value', // input
	[SUBTITLES]: 'checked' // input-checkbox
};
const PAGE_CHECK_TIMEOUT = 1000;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const onPageChange = async () => {
	if (location.pathname !== '/watch') return;
	await sleep(PAGE_CHECK_TIMEOUT);

	/* ---------------------- apply settings ---------------------- */

	untilAppear(getChannelName).then(name => {
		if (menuCont) {
			isTheSameChannel = channelName === name;
			menuCont.style.display = isTheSameChannel ? 'block' : 'none';
		} else channelName = name;
	});
	if (!channelCfg) {
		const channelId = await untilChannelIdAppear();
		channelCfg = cfg.channels[channelId] ||= {};
	}

	const plr = await untilAppear(getPlr);
	await sleep(1000);
	const getAd = () => plr.querySelector('.ytp-ad-player-overlay');
	if (getAd()) await until(getAd, ad => !ad);
	ytMenu = Object.assign(plr.querySelector('.ytp-settings-menu'), {
		_btn: plr.querySelector('.ytp-settings-button'),
		isOpen() {return this.style.display !== 'none'},
		open()  {this.isOpen() || this._btn.click()},
		close() {this.isOpen() && this._btn.click()},
		openItem(item) {
			this.open();
			item.click();
			return Array.from(this.querySelectorAll('.ytp-panel-animate-forward .ytp-menuitem-label'));
		}
	});
	ytMenu.open();
	ytMenu.close();
	const getMenuItems = () => ytMenu.querySelectorAll('.ytp-menuitem[role="menuitem"]');
	const menuItemArr = Array.from(await until(getMenuItems, arr => arr.length));
	const areSubtitles = menuItemArr.length === 3;
	ytSettingItems = {
		[QUALITY]: addValueSetter(menuItemArr.at(-1), setValue),
		[SPEED]: addValueSetter(menuItemArr[0], setSpeedValue)
	};
	if (areSubtitles) ytSettingItems[SUBTITLES] = addValueSetter(
		plr.querySelector('.ytp-subtitles-button'), setSubtitlesValue
	);
	if (!SPEED_NORMAL) {
		const labels = ytMenu.openItem(ytSettingItems[SPEED]);
		for (const label of labels) {
			const text = label.textContent;
			if (!+text) {
				SPEED_NORMAL = text;
				break;
			}
		}
		ytMenu.close();
	}
	const doNotChangeSpeed = cfg.global.speed && cfg.flags.standardMusicSpeed && (await isMusicChannel());
	const settings = Object.assign({},
		cfg.global,
		doNotChangeSpeed && {[SPEED]: SPEED_NORMAL},
		isTheSameChannel && channelCfg
	);
	isSpeedChanged = false;
	for (const setting in settings)
		ytSettingItems[setting].setValue(settings[setting], setting);

	/* ---------------------- settings menu ---------------------- */

	if (menuCont) return;

	const
		div = props => el('div', props),
		input = props => el('input', props),
		checkbox = props => input(Object.assign({type: 'checkbox'}, props)),
		labelEl = (forId, props) => {
			const elem = el('label', props);
			elem.setAttribute('for', forId);
			return elem;
		},
		btnClass = 'yt-spec-button-shape-next',
		button = (text, props) => el('button', Object.assign({
			textContent: text,
			className: `${btnClass} ${btnClass}--tonal ${btnClass}--mono ${btnClass}--size-m`,
			onfocus() {this.classList.add(btnClass + '--focused')},
			onblur() {this.classList.remove(btnClass + '--focused')}
		}, props));
	menuCont = div({id: CONT_ID});
	menuCont.style.position = 'relative';
	const menu = div({
		id: MENU_ID,
		isOpen: false,
		closeListener: {
			listener({target: el}) {
				if (el === menu || el.closest('#' + menu.id)) return;
				menu.toggle();
			},
			add() {document.addEventListener('click', this.listener)},
			remove() {document.removeEventListener('click', this.listener)},
		},
		toggle: debounce(function() {
			if (this.isOpen) {
				this.style.visibility = 'hidden';
				this.closeListener.remove();
			} else {
				this.style.visibility = 'visible';
				this.closeListener.add();
			}
			this.isOpen = !this.isOpen;
		}, 100)
	});

	const createSection = (sectionId, title, sectionCfg) => {
		const section = div({role: 'group'});
		section.setAttribute('aria-labelledby', sectionId);
		const addItem = (name, textContent, elem) => {
			const item = div();
			const id = PREFIX + name + '-' + sectionId;
			const label = labelEl(id, {textContent});
			Object.assign(elem, {
				id,
				name: name,
				onchange() {
					const value = this[valueProps[name]];
					if (value === '' || value === 'default') delete sectionCfg[name];
					else sectionCfg[name] = value;
				}
			});
			const cfgValue = sectionCfg[name];
			if (cfgValue) setTimeout(() => {
				elem[valueProps[name]] = cfgValue;
			});
			item.append(label, elem);
			section.append(item);
			return {elem};
		};

		const toOptions = (values, getText) => {
			values.unshift(el('option', {
				value: text.DEFAULT,
				textContent: text.DEFAULT,
				checked: true
			}));
			for (let i = 1; i < values.length; i++)
				values[i] = el('option', {
					value: values[i],
					textContent: getText(values[i])
				});
			return values;
		};
		const speedValues = ['2', '1.75', '1.5', '1.25', SPEED_NORMAL, '0.75', '0.5', '0.25'];
		const qualityValues = ['144', '240', '360', '480', '720', '1080', '1440', '2160', '4320'];

		const addSelectItem = (name, text, options, getText) =>
			addItem(name, text, el('select')).elem.append(...toOptions(options, getText));

		section.append(el('span', {textContent: title, id: sectionId}));
		addSelectItem(SPEED, text.SPEED, speedValues, val => val);
		addSelectItem(QUALITY, text.QUALITY, qualityValues, val => val + 'p');
		addItem(SUBTITLES, text.SUBTITLES, checkbox());
		return section;
	};

	const sections = div({className: PREFIX + 'sections'});
	sections.append(
		createSection(GLOBAL, text.GLOBAL, cfg.global),
		createSection(LOCAL, text.LOCAL, channelCfg)
	);
	const checkboxDiv = (id, cfgName, text) => {
		const cont = div({className: 'check-cont'});
		id = PREFIX + id;
		cont.append(
			labelEl(id, {textContent: text}),
			checkbox({
				id,
				checked: cfg.flags[cfgName],
				onclick() {cfg.flags[cfgName] = this.checked}
			})
		);
		return cont;
	};

	menu.append(
		sections,
		checkboxDiv('shorts', 'shortsToUsual', text.SHORTS),
		checkboxDiv('new-tab', 'newTab', text.NEW_TAB),
		checkboxDiv('copy-subs', 'copySubs', text.COPY_SUBS),
		checkboxDiv('standard-music-speed', 'standardMusicSpeed', text.STANDARD_MUSIC_SPEED),
		button(text.SAVE, {
			setTextDefer: debounce(function(text) {this.textContent = text}, 1000),
			onclick() {
				saveCfg();
				this.textContent = text.SAVED;
				this.setTextDefer(text.SAVE);
			}
		})
	);
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
	for (const key in iconStyle) settingsIcon.setAttribute(key, iconStyle[key]);
	settingsIcon.append($('settings'));
	const btn = button('', {
		id: BTN_ID,
		ariaLabel: 'open additional settings',
		tabIndex: 0,
		onclick() {menu.toggle()}
	});
	btn.setAttribute('aria-controls', MENU_ID);
	btn.classList.add(btnClass + '--icon-button');
	btn.append(settingsIcon);
	menuCont.append(btn);
	const actionsBar = await untilAppear(getActionsBar);
	actionsBar.insertBefore(menuCont, actionsBar.lastChild);
	menu.style.top = (btn.offsetHeight + 10) + 'px';
	menuCont.append(menu);
};

let lastHref;
setInterval(() => {
	if (lastHref === location.href) return;
	lastHref = location.href;
	onPageChange();
}, PAGE_CHECK_TIMEOUT);

const onClick = e => {
	const {shortsToUsual, newTab} = cfg.flags;
	if (!shortsToUsual && !newTab) return;
	let el = e.target;
	if (el.tagName !== 'A') {
		el = el.closest('a');
		if (!el) return;
	}
	if (!/shorts\/|watch\?v=/.test(el.href)) return;
	if (shortsToUsual) el.href = el.href.replace('shorts/', 'watch?v=');
	if (newTab) {
		el.target = '_blank';
		e.stopPropagation();
	}
};

const getCfgValue = key =>
	(isTheSameChannel && channelCfg?.[key]) || cfg.global[key];

document.addEventListener('click', onClick, {capture: true});
document.addEventListener('keyup', e => {
	if (e.code === 'Enter') return onClick(e);
	if (!e.ctrlKey) return;
	if (cfg.flags.copySubs && e.code === 'KeyC') {
		const plr = document.querySelector('.html5-video-player');
		if (!plr?.classList.contains('ytp-fullscreen')) return;
		const text = Array.from(
			plr.querySelectorAll('.captions-text > span')
		).map(line => line.textContent).join(' ');
		navigator.clipboard.writeText(text);
		return;
	}
	if (e.code !== 'Space') return;
	const setting = e.shiftKey ? QUALITY : SPEED;
	ytSettingItems[setting].setValue(getCfgValue(setting));
	e.stopPropagation();
	e.preventDefault();
});

const
	m = '#' + MENU_ID,
	d = ' div', i = ' input', s = ' select', bg = 'var(--yt-spec-menu-background)',
	underline = 'border-bottom: 2px solid var(--yt-spec-text-primary);';

document.head.append(el('style', {textContent:`
#${CONT_ID} {color: var(--yt-spec-text-primary); font-size: 14px}
#${BTN_ID} {margin-left: 8px}
${m} {
display: flex;
visibility: hidden;
flex-direction: column;
position: absolute;
right: 0;
background: ${bg};
border-radius: 2rem;
padding: 1rem;
text-align: center;
box-shadow: 0px 4px 32px 0px var(--yt-spec-static-overlay-background-light);
z-index: 2202;
}
${m+d} {display: flex; margin-bottom: 1rem}
${m+d+d} {
flex-direction: column;
margin: 0 2rem;
}
${m+d+d+d} {
flex-direction: row;
margin: 1rem 0;
}
${m+s}, ${m+i} {
text-align: center;
background: ${bg};
border: none;
${underline}
color: inherit;
width: 5rem;
padding: 0;
margin-left: auto;
}
${m+i} {outline: none}
${m+d+d+d}:focus-within > label, ${m} .check-cont:focus-within > label {${underline}}
${m} .check-cont {padding: 0 1rem}
${m+s} {appearance: none; outline: none}
${m} label {margin-right: 1.5rem; white-space: nowrap}
${m+i}::-webkit-outer-spin-button,
${m+i}::-webkit-inner-spin-button {-webkit-appearance: none; margin: 0}
${m+i}[type=number] {-moz-appearance: textfield}
${m+s}::-ms-expand {display: none}`}));
})();