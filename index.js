// ==UserScript==
// @name         YouTube Defaulter
// @namespace    https://greasyfork.org/ru/users/901750-gooseob
// @version      1
// @description  Set speed, quality and subtitles as default globally or specialize for each channel
// @author       GooseOb
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// ==/UserScript==

(function() {
const
	STORAGE_NAME = 'YTDefaulter',
	STORAGE_VERSION = 1,
	PREFIX = 'YTDef-',
	SUBTITLES = 'subtitles',
	SPEED = 'speed',
	QUALITY = 'qualityMax';
let cfg = localStorage[STORAGE_NAME];
cfg = cfg ? JSON.parse(cfg) : {
	_v: STORAGE_VERSION,
	shortsToUsual: false,
	newTab: false,
	global: {},
	channels: {}
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

function debounce(callback, cooldown) {
	let timeout;
	return function(...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			callback.apply(this, args);
		}, cooldown);
	};
};

const channelId = {
	value: null,
	update() {
		this.value = document.querySelector('meta[itemprop="channelId"]').content;
	}
};
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
const onPageChange = () => {setTimeout(() => {
	if (window.location.pathname !== '/watch') return;
	channelId.update();

	/* ---------------------- apply settings ---------------------- */

	const channelCfg = cfg.channels[channelId.value] ||= {};
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

	const
		div = props => el('div', props),
		input = props => el('input', props),
		checkbox = props => input(Object.assign({type: 'checkbox'}, props)),
		btnClass = 'yt-spec-button-shape-next',
		focused = (elem, className) => Object.assign(elem, {
			onfocus() {this.classList.add(className + '--focused')},
			onblur() {this.classList.remove(className + '--focused')}
		}),
		button = (text, props) => focused(el('button', Object.assign({
			textContent: text,
			className: `${btnClass} ${btnClass}--tonal ${btnClass}--mono ${btnClass}--size-m`
		}, props)), btnClass);
	const container = div({id: PREFIX + 'cont'});
	container.style.position = 'relative';
	const menu = div({
		id: PREFIX + 'menu',
		isOpen: false,
		closeListener(e) {
			const el = e.target;
			if (el === menu || el.closest('#' + menu.id)) return;
			menu.toggle(e);
		},
		removeCloseListener() {document.removeEventListener('click', this.closeListener)},
		toggle(e) {
			this.style.visibility = this.isOpen ? 'hidden' : 'visible';
			this.isOpen = !this.isOpen;
			if (!this.isOpen) return this.removeCloseListener();
			document.addEventListener('click', this.closeListener);
			e.stopPropagation();
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
			const id = PREFIX + label;
			const labelEl = el('label', {
				textContent: label[0].toUpperCase() + label.slice(1),
				for: id
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
			item.append(labelEl, elem);
			section.append(item);
			return {elem, item};
		};

		const options = ['default', '2', '1.75', '1.5', '1.25', '0.75', '0.5', '0.25']
			.map((value, i) => el('option', {
				value,
				textContent: value
			}));
		options[0].checked = true;

		section.append(el('span', {textContent: title, id: sectionLabel}));
		addItem(SPEED, el('select'))
			.elem.append(...options);
		addItem(QUALITY, input({type: 'number', min: '144'}));
		addItem(SUBTITLES, checkbox())
			.item.className = 'cont-checkbox';
		return section;
	};

	const sections = div();
	sections.append(
		createSection(GLOBAL, cfg.global),
		createSection(LOCAL, channelCfg)
	);
	const getCheckboxDiv = (id, cfgName, text) => {
		const cont = div({className: PREFIX + 'check-cont'});
		id = PREFIX + id;
		cont.append(
			el('label', {textContent: text, for: id}),
			checkbox({id, checked: cfg[cfgName], onclick() {cfg[cfgName] = this.checked}})
		);
		return cont;
	};

	menu.append(
		sections,
		getCheckboxDiv('shorts', 'shortsToUsual', 'Open shorts as a usual video'),
		getCheckboxDiv('new-tab', 'newTab', 'Open videos in a new tab'),
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
		id: PREFIX + 'btn',
		ariaLabel: 'open additional settings',
		tabIndex: 0,
		onclick(e) {menu.toggle(e)}
	});
	btn.classList.add(btnClass + '--icon-button');
	btn.append(svg);
	container.append(btn);
	const interval = setInterval(() => {
		const root = document.getElementById('actions')?.querySelector('ytd-menu-renderer');
		if (!root) return;
		root.insertBefore(container, root.lastChild);
		menu.style.top = (btn.offsetHeight + 10) + 'px';
		container.append(menu);
		clearInterval(interval);
	}, 100);
}, 300)};

onPageChange();

let lastHistoryState = history.state;
setInterval(() => {
	if (history.state === lastHistoryState) return;
	lastHistoryState = history.state;
	onPageChange();
}, 1000);

const onClick = e => {
	if (!cfg.shortsToUsual && !cfg.newTab) return;
	let el = e.target;
	if (el.tagName !== 'A') el = el.closest('a');
	if (!el || !/shorts\/|watch\?v=/.test(el.href)) return;
	if (cfg.shortsToUsual) el.href = el.href.replace('shorts/', 'watch?v=');
	if (cfg.newTab) el.target = '_blank';
	e.stopPropagation();
};

document.addEventListener('click', onClick, {capture: true});
document.addEventListener('keyup', e => {
	if (e.code === 'Enter') return onClick(e);
	if (!e.ctrlKey || e.code !== 'Space') return;
	if (e.shiftKey) {
		ytSettingItems[QUALITY].setValue(cfg.global[QUALITY]);
	} else {
		ytSettingItems[SPEED].setValue(isSpeedChanged ? SPEED_NORMAL : cfg.global[SPEED]);
		isSpeedChanged = !isSpeedChanged;
	};
	e.stopPropagation();
	e.preventDefault();
});

const
	m = '#' + PREFIX + 'menu',
	d = ' div', i = ' input', s = ' select', bg = 'var(--yt-spec-menu-background)',
	underline = 'border-bottom: 2px solid var(--yt-spec-text-primary);';

document.head.append(el('style', {
textContent:`
#${PREFIX}cont {color: var(--yt-spec-text-primary); font-size: 14px}
#${PREFIX}btn {margin-left: 8px}
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
	margin: 0 1rem;
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
${m+d+d+d}:focus-within > label, .${PREFIX}check-cont:focus-within > label {${underline}}
.${PREFIX}check-cont {padding: 0 1rem}
${m+s} {appearance: none; outline: none}
${m} label {margin-right: 1.5rem}
${m+i}::-webkit-outer-spin-button,
${m+i}::-webkit-inner-spin-button {-webkit-appearance: none; margin: 0}
${m+i}[type=number] {-moz-appearance: textfield}
${m+s}::-ms-expand {display: none}`
}));
})();