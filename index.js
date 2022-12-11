// ==UserScript==
// @name         YouTube Defaulter
// @namespace    https://greasyfork.org/ru/users/901750-gooseob
// @version      1.3.2
// @description  Set speed, quality and subtitles as default globally or specialize for each channel
// @author       GooseOb
// @license      MIT
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// ==/UserScript==

(function() {
const
	STORAGE_NAME = 'YTDefaulter',
	STORAGE_VERSION = 2,
	PREFIX = 'YTDef-',
	CONT_ID = PREFIX + 'cont',
	MENU_ID = PREFIX + 'menu',
	BTN_ID = PREFIX + 'btn',
	SUBTITLES = 'subtitles',
	SPEED = 'speed',
	QUALITY = 'qualityMax';
let cfg = localStorage[STORAGE_NAME];
cfg = cfg ? JSON.parse(cfg) : {
	_v: STORAGE_VERSION,
	global: {},
	channels: {},
	flags: {
		shortsToUsual: false,
		newTab: false,
		copySubs: false
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

const untilAppear = getItem => new Promise(resolve => {
	const interval = setInterval(() => {
		const item = getItem();
		if (!item) return;
		clearInterval(interval);
		resolve(item);
	}, 10);
});

let channelId, channelName;

const getChannelName = () => new URLSearchParams(location.search).get('ab_channel');
const getChannelId = () => document.querySelector('meta[itemprop="channelId"]')?.content;

const
	GLOBAL = 'global',
	LOCAL = 'this channel',
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
const onPageChange = () => {setTimeout(async () => {
	if (location.pathname !== '/watch') return;

	/* ---------------------- apply settings ---------------------- */

	if (!channelName) untilAppear(getChannelName)
		.then(name => {channelName = name});
	channelId ||= await untilAppear(getChannelId);

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
	const menuItemArr = Array.from(ytMenu.querySelectorAll('.ytp-menuitem[role="menuitem"]'));
	// [quality, subtitles?, speed]
	const areSubtitles = menuItemArr.length === 3;
	ytSettingItems = {
		[QUALITY]: addValueSetter(menuItemArr.at(-1), setValue),
		[SPEED]: addValueSetter(menuItemArr[0], setValue),
		[SUBTITLES]: areSubtitles && addValueSetter(
			ytp.querySelector('.ytp-subtitles-button')
			, setSubtitlesValue)
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
	const settings = Object.assign({}, cfg.global, channelCfg);
	if (!areSubtitles) delete settings[SUBTITLES];
	for (const setting in settings)
		ytSettingItems[setting].setValue(settings[setting]);
	if (settings[SPEED]) isSpeedChanged = true;

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
		closeListener(e) {
			const el = e.target;
			if (el === menu || el.closest('#' + menu.id)) return;
			menu.toggle(e);
		},
		removeCloseListener() {document.removeEventListener('click', this.closeListener)},
		toggle(e) {
			if (this.isOpen) {
				this.style.visibility = 'hidden';
				this.removeCloseListener();
			} else {
				this.style.visibility = 'visible';
				document.addEventListener('click', this.closeListener);
				e.stopPropagation();
			};
			this.isOpen = !this.isOpen;
		}
	});
	const getChangeHandler = (cfg, key) => function() {
		const value = this[valueProps[key]];
		if (value === '' || value === 'default') delete cfg[key];
		else cfg[key] = value;
	};

	const createSection = (title, sectionCfg) => {
		const section = div({role: 'group'});
		const sectionLabel = title.replace(/ /g, '-');
		section.setAttribute('aria-labelledby', sectionLabel);
		const addItem = (label, elem) => {
			const item = div();
			const id = PREFIX + label + '_' + sectionLabel;
			const labelElem = labelEl(id, {
				textContent: label[0].toUpperCase() + label.slice(1),
			});
			Object.assign(elem, {
				id,
				name: label,
				onchange: getChangeHandler(sectionCfg, label)
			});
			const cfgValue = sectionCfg[label];
			if (cfgValue) setTimeout(() => {
				elem[valueProps[label]] = cfgValue;
			});
			item.append(labelElem, elem);
			section.append(item);
			return {elem};
		};

		const options = ['default', '2', '1.75', '1.5', '1.25', SPEED_NORMAL, '0.75', '0.5', '0.25']
			.map(value => el('option', {
				value,
				textContent: value
			}));
		options[0].checked = true;

		section.append(el('span', {textContent: title, id: sectionLabel}));
		addItem(SPEED, el('select'))
			.elem.append(...options);
		addItem(QUALITY, input({type: 'number', min: '144'}));
		addItem(SUBTITLES, checkbox());
		return section;
	};

	const sections = div({className: PREFIX + 'sections'});
	sections.append(
		createSection(GLOBAL, cfg.global),
		createSection(LOCAL, channelCfg)
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
		checkboxDiv('shorts', 'shortsToUsual', 'Open shorts as a usual video'),
		checkboxDiv('new-tab', 'newTab', 'Open videos in a new tab'),
		checkboxDiv('copy-subs', 'copySubs', 'Copy subtitles by Ctrl+C in fullscreen mode'),
		button('Save', {
			setTextDefer: debounce(function(text) {this.textContent = text}, 1000),
			onclick() {
				saveCfg();
				this.textContent = 'Saved';
				this.setTextDefer('Save');
			}
		})
	);
	menu.addEventListener('keyup', e => {
		const el = e.target;
		if (e.code === 'Enter' && el.type === 'checkbox')
			el.checked = !el.checked;
	});

	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	Object.entries({
		viewBox: '0 0 24 24',
		width: '24', height: '24',
		fill: 'var(--yt-spec-text-primary)'
	}).forEach(([key, value]) => {svg.setAttribute(key, value)})
	svg.append(document.getElementById('settings'));
	const btn = button('', {
		id: BTN_ID,
		ariaLabel: 'open additional settings',
		tabIndex: 0,
		onclick(e) {menu.toggle(e)}
	});
	btn.setAttribute('aria-controls', MENU_ID);
	btn.classList.add(btnClass + '--icon-button');
	btn.append(svg);
	container.append(btn);
	const getActionsBar = () =>
		document.getElementById('actions')?.querySelector('ytd-menu-renderer');
	const actionsBar = await untilAppear(getActionsBar);
	actionsBar.insertBefore(container, actionsBar.lastChild);
	menu.style.top = (btn.offsetHeight + 10) + 'px';
	container.append(menu);
}, 300)};

onPageChange();

let {
	pathname: lastPathname,
	search: lastParams
} = location;
setInterval(() => {
	if (lastPathname === location.pathname && (lastPathname !== '/watch' || lastParams === location.search)) return;
	lastPathname = location.pathname;
	lastParams = location.search;
	onPageChange();
}, 1000);

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