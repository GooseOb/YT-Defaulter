// ==UserScript==
// @name         YouTube Defaulter
// @namespace    https://greasyfork.org/ru/users/901750-gooseob
// @version      1.4.2
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
	QUALITY: 'MaxQuality',
	GLOBAL: 'global',
	LOCAL: 'this channel',
	SHORTS: 'Open shorts as a usual video',
	NEW_TAB: 'Open videos in a new tab',
	COPY_SUBS: 'Copy subtitles by Ctrl+C in fullscreen mode',
	STANDARD_MUSIC_SPEED: 'Don\'t change speed on artist channels',
	SAVE: 'Save',
	SAVED: 'Saved',
	DEFAULT: 'default'
};
const translations = {
	'be-BY': {
		SUBTITLES: 'Субтытры',
		SPEED: 'Хуткасьць',
		QUALITY: 'МаксЯкасьць',
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
Object.assign(text, translations[document.documentElement.lang]);

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
	const channelCfgCopy = copyObj(cfg.channels);
	for (const key in channelCfgCopy) {
		const channelCfg = channelCfgCopy[key];
		const {length} = Object.keys(channelCfg);
		if (!length || (length === 1 && channelCfg.subtitles === false))
			delete channelCfgCopy[key];
	};
	cfgCopy.channels = channelCfgCopy;

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
	};
	saveCfg();
};

function debounce(callback, delay) {
	let timeout;
	return function(...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			callback.apply(this, args);
		}, delay);
	};
};

const until = (getItem, check) => new Promise((res, rej) => {
	let i = 0;
	const interval = setInterval(() => {
		if (i++ > 1000) rej();
		const item = getItem();
		if (!check(item)) return;
		clearInterval(interval);
		res(item);
	}, 10);
});

const untilAppear = getItem => until(getItem, Boolean);

let channelId, channelName;

const getChannelName = () => new URLSearchParams(location.search).get('ab_channel');
const validateChannelId = id => id?.includes('/') ? null : id;
const getChannelId = () => validateChannelId(
	document.querySelector('meta[itemprop="channelId"]')
		?.content ||
	document.querySelector('.ytp-ce-channel-title.ytp-ce-link')
		?.pathname.replace('/channel/', '')
);

const getPlr = () => document.getElementById('movie_player');
const getAboveTheFold = () => document.getElementById('above-the-fold');
const getActionsBar = () =>
	document.getElementById('actions')?.querySelector('ytd-menu-renderer');

const isMusicChannel = async () => {
	const el = await untilAppear(getAboveTheFold);
	return !!el.querySelector('.badge-style-type-verified-artist');
};

const
	addValueSetter = (el, fn) => Object.assign(el, {setValue: fn}),
	el = (tag, props) => Object.assign(document.createElement(tag), props);
let ytMenu, ytSettingItems, SPEED_NORMAL;
let isSpeedChanged = false;
function setValue(value) {
	const btns = ytMenu.openItem(this).reverse();
	const check = this === ytSettingItems[QUALITY]
		? content => parseInt(content) <= value
		: content => content === value;

	while (btns.length) {
		const btn = btns.pop();
		if (!check(btn.textContent)) continue;
		btn.click();
		break;
	};
	ytMenu.close();
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
	console.log('start');

	/* ---------------------- apply settings ---------------------- */

	if (!channelName) untilAppear(getChannelName)
		.then(name => {channelName = name; console.log('name');});
	channelId ||= await untilAppear(getChannelId);

	const plr = await untilAppear(getPlr);
	await sleep(1000);
	const getAd = () => plr.querySelector('.ytp-ad-player-overlay');
	if (getAd()) await until(getAd, ad => !ad);

	const channelCfg = cfg.channels[channelId] ||= {};
	const ytp = document.getElementById('movie_player');
	ytMenu = Object.assign(ytp.querySelector('.ytp-settings-menu'), {
		btn: ytp.querySelector('.ytp-settings-button'),
		isOpen() {return this.style.display !== 'none'},
		open()  {this.isOpen() || this.btn.click()},
		close() {this.isOpen() && this.btn.click()},
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
		[SPEED]: addValueSetter(menuItemArr[0], setValue),
		[SUBTITLES]: areSubtitles && addValueSetter(
			ytp.querySelector('.ytp-subtitles-button'), setSubtitlesValue
		)
	};
	if (!SPEED_NORMAL) {
		const labels = ytMenu.openItem(ytSettingItems[SPEED]);
		while (labels.length) {
			const label = labels.pop().textContent;
			if (+label) continue;
			SPEED_NORMAL = label;
			break;
		};
		ytMenu.close();
	};
	const settings = Object.assign(
		{},
		cfg.global,
		cfg.flags.standardMusicSpeed && (await isMusicChannel()) &&
			{[SPEED]: SPEED_NORMAL},
		channelCfg
	);
	if (!areSubtitles) delete settings[SUBTITLES];
	for (const setting in settings)
		ytSettingItems[setting].setValue(settings[setting]);
	if (settings[SPEED] !== SPEED_NORMAL) isSpeedChanged = true;

	/* ---------------------- settings menu ---------------------- */

	const existingContainer = document.getElementById(CONT_ID);
	if (existingContainer) {
		untilAppear(getChannelName).then(name => {
			existingContainer.style.display = channelName === name ? 'block' : 'none';
		});
		return;
	};

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
	const container = div({id: CONT_ID});
	container.style.position = 'relative';
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
			};
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

		const options = [text.DEFAULT, '2', '1.75', '1.5', '1.25', SPEED_NORMAL, '0.75', '0.5', '0.25']
			.map(value => el('option', {
				value,
				textContent: value
			}));
		options[0].checked = true;

		section.append(el('span', {textContent: title, id: sectionId}));
		addItem(SPEED, text.SPEED, el('select'))
			.elem.append(...options);
		addItem(QUALITY, text.QUALITY, input({type: 'number', min: '144'}));
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
	settingsIcon.append(document.getElementById('settings'));
	const btn = button('', {
		id: BTN_ID,
		ariaLabel: 'open additional settings',
		tabIndex: 0,
		onclick() {menu.toggle()}
	});
	btn.setAttribute('aria-controls', MENU_ID);
	btn.classList.add(btnClass + '--icon-button');
	btn.append(settingsIcon);
	container.append(btn);
	const actionsBar = await untilAppear(getActionsBar);
	actionsBar.insertBefore(container, actionsBar.lastChild);
	menu.style.top = (btn.offsetHeight + 10) + 'px';
	container.append(menu);
};

onPageChange();

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
	if (el.tagName !== 'A') el = el.closest('a');
	if (!el || !/shorts\/|watch\?v=/.test(el.href)) return;
	if (shortsToUsual) el.href = el.href.replace('shorts/', 'watch?v=');
	if (newTab) {
		el.target = '_blank';
		e.stopPropagation();
	};
};

document.addEventListener('click', onClick, {capture: true});
document.addEventListener('keyup', e => {
	if (e.code === 'Enter') return onClick(e);
	if (cfg.flags.copySubs && e.ctrlKey && e.code === 'KeyC') {
		const plr = document.querySelector('.html5-video-player');
		if (!plr || plr.ariaLabel !== 'YouTube Video Player in Fullscreen') return;
		const lines = Array.from(plr.querySelectorAll('.captions-text > span'));
		const result = lines.map(line => line.textContent).join(' ');
		navigator.clipboard.writeText(result);
		return;
	};
	if (!e.ctrlKey || e.code !== 'Space') return;
	const channelCfg = cfg.channels[channelId];
	const getCfgValue = key => channelCfg?.[key] || cfg.global[key];
	if (e.shiftKey) {
		ytSettingItems[QUALITY].setValue(getCfgValue(QUALITY));
	} else {
		ytSettingItems[SPEED].setValue(isSpeedChanged ? SPEED_NORMAL : getCfgValue(SPEED));
		isSpeedChanged = !isSpeedChanged;
	};
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