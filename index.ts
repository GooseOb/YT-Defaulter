const enum STORAGE {
	NAME = 'YTDefaulter',
	VERSION = 4
}
const enum SECTION {
	GLOBAL = 'global',
	LOCAL = 'thisChannel'
}
type AnyFn = (...args: any[]) => any;
(function() {
const
	PREFIX = 'YTDef-',
	CONT_ID = PREFIX + 'cont',
	MENU_ID = PREFIX + 'menu',
	BTN_ID = PREFIX + 'btn',
	SUBTITLES = 'subtitles',
	SPEED = 'speed',
	QUALITY = 'quality';
const text = {
	OPEN_SETTINGS: 'Open additional settings',
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
type Dict = Record<keyof typeof text, string>;

const translations: Record<string, Partial<Dict>> = {
	'be-BY': {
		OPEN_SETTINGS: 'Адкрыць дадатковыя налады',
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
// @ts-ignore
Object.assign(text, translations[document.documentElement.lang]);

type FlagName = 'shortsToUsual' | 'newTab' | 'copySubs' | 'standardMusicSpeed';
type Cfg = {
	speed?: string,
	quality?: string,
	subtitles?: boolean
};
type Setting = keyof Cfg;
type ScriptCfg = {
	_v: number,
	global: Cfg,
	channels: Record<string, Cfg>,
	flags: Record<FlagName, boolean>
};
const cfgLocalStorage = localStorage[STORAGE.NAME];
const cfg: ScriptCfg = cfgLocalStorage ? JSON.parse(cfgLocalStorage) : {
	_v: STORAGE.VERSION,
	global: {},
	channels: {},
	flags: {
		shortsToUsual: false,
		newTab: false,
		copySubs: false,
		standardMusicSpeed: false
	}
};
const copyObj = <T extends object>(obj: T): T => Object.assign({}, obj);
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

	localStorage[STORAGE.NAME] = JSON.stringify(cfgCopy);
};

if (cfg._v !== STORAGE.VERSION)  {
	switch (cfg._v) {
		case 1:
			const {shortsToUsual, newTab} = cfg as any;
			(cfg as any).flags = {
				shortsToUsual, newTab,
				copySubs: false
			};
			delete (cfg as any).shortsToUsual;
			delete (cfg as any).newTab;
			cfg._v = 2;
		case 2:
			cfg.flags.standardMusicSpeed = false;
			cfg._v = 3;
		case 3:
			cfg.global.quality = (cfg.global as any).qualityMax;
			delete (cfg.global as any).qualityMax;
			for (const key in cfg.channels) {
				const currCfg = cfg.channels[key];
				currCfg.quality = (currCfg as any).qualityMax;
				delete (currCfg as any).qualityMax;
			}
			cfg._v = STORAGE.VERSION;
	}
	saveCfg();
}

function debounce(callback: AnyFn, delay: number): AnyFn {
	let timeout: number;
	return function(...args) {
		clearTimeout(timeout);
		timeout = window.setTimeout(() => {
			callback.apply(this, args);
		}, delay);
	};
}
const restoreFocusAfter = (cb: AnyFn) => {
	const el = document.activeElement as HTMLElement;
	cb();
	el.focus();
};

const until = <TGetter extends AnyFn>(
	getItem: TGetter,
	check: (item: any) => boolean,
	msToWait = 10_000,
	msReqDelay = 20
) => new Promise<ReturnType<TGetter>>((res, rej) => {
	const reqLimit = msToWait / msReqDelay;
	let i = 0;
	const interval = setInterval(() => {
		if (i++ > reqLimit) exit(rej);
		const item = getItem();
		if (!check(item)) return;
		exit(() => res(item));
	}, msReqDelay);
	const exit = (cb: AnyFn) => {
		clearInterval(interval);
		cb();
	};
});

const untilAppear = <TGetter extends AnyFn>(getItem: TGetter, msToWait?: number) =>
	until(getItem, Boolean, msToWait);

let channelCfg: Cfg, channelName: string;
let isTheSameChannel = true;

const $ = (id: string) => document.getElementById(id);

const getChannelName = () => new URLSearchParams(location.search).get('ab_channel');
const getChannelUsername = () => (
	document.querySelector('span[itemprop="author"] > link[itemprop="url"]') as HTMLLinkElement
)?.href.replace(/.*\/@/, '');

const getPlr = () => $('movie_player');
const getAboveTheFold = () => $('above-the-fold');
const getActionsBar = () =>
	$('actions')?.querySelector('ytd-menu-renderer');

const untilChannelUsernameAppear = () =>
	untilAppear(getChannelUsername).catch(() => '');

const isMusicChannel = async () => {
	const el = await untilAppear(getAboveTheFold);
	return !!el.querySelector('.badge-style-type-verified-artist');
}

type YtMenuApi = {
	_btn: HTMLButtonElement,
	isOpen(): boolean,
	open(): void,
	close(): void,
	openItem(item: HTMLElement): HTMLElement[]
};
type YtMenu = HTMLDivElement & YtMenuApi;
type YtSettingItems = Partial<Record<Setting, HTMLButtonElement & {setValue: AnyFn}>>;

const
	addValueSetter = <TElem extends HTMLElement>(el: TElem, setValue: AnyFn) => Object.assign(el, {setValue}),
	el = (tag: string, props?: object) => Object.assign(document.createElement(tag), props);
let ytMenu: YtMenu, ytSettingItems: YtSettingItems, SPEED_NORMAL: string, menuCont: HTMLElement;
let isSpeedChanged = false;
const comparators = {
	[QUALITY]: (value: string, current: string) => +value >= parseInt(current),
	[SPEED]: (value: string, current: string) => value === current
} as const;
function setValue(value: string, setting: keyof typeof comparators) {
	const compare = comparators[setting];

	for (const btn of ytMenu.openItem(this))
		if (compare(value, btn.textContent)) {
			btn.click();
			break;
		}

	ytMenu.close();
}
function setSpeedValue(value: string, setting: Setting) {
	setValue.apply(this, [isSpeedChanged ? SPEED_NORMAL : value, setting]);
	isSpeedChanged = !isSpeedChanged;
}
function setSubtitlesValue(value: boolean) {
	if (this.ariaPressed !== value.toString()) this.click();
}
const valueProps = {
	[SPEED]: 'value', // select
	[QUALITY]: 'value', // input
	[SUBTITLES]: 'checked' // input-checkbox
} as const;
const updateMenuVisibility = async () => {
	const name = await untilAppear(getChannelName);
	if (menuCont) {
		isTheSameChannel = channelName === name;
		menuCont.style.display = isTheSameChannel ? 'block' : 'none';
	} else channelName = name;
};
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
const onPageChange = async () => {
	if (location.pathname !== '/watch') return;

	/* ---------------------- apply settings ---------------------- */

	updateMenuVisibility();

	if (!channelCfg) {
		const channelUsername = await untilChannelUsernameAppear();
		channelCfg = cfg.channels[channelUsername] ||= {};
	}

	const plr = await untilAppear(getPlr);
	await delay(1_000);
	const getAd = () => plr.querySelector('.ytp-ad-player-overlay');
	if (getAd()) await until(getAd, ad => !ad, 200_000);
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
	} as YtMenuApi) as YtMenu;
	restoreFocusAfter(() => {
		ytMenu.open();
		ytMenu.close();
	});
	const getMenuItems = () => ytMenu.querySelectorAll('.ytp-menuitem[role="menuitem"]');
	const menuItemArr = Array.from(await until(getMenuItems, arr => arr.length)) as HTMLButtonElement[];
	const areSubtitles = menuItemArr.length === 3;
	ytSettingItems = {
		[QUALITY]: addValueSetter(menuItemArr.at(-1), setValue),
		[SPEED]: addValueSetter(menuItemArr[0], setSpeedValue)
	};
	if (areSubtitles) ytSettingItems[SUBTITLES] = addValueSetter(
		plr.querySelector('.ytp-subtitles-button'), setSubtitlesValue
	);
	if (!SPEED_NORMAL) restoreFocusAfter(() => {
		const labels = ytMenu.openItem(ytSettingItems[SPEED]);
		for (const label of labels) {
			const text = label.textContent;
			if (!+text) {
				SPEED_NORMAL = text;
				break;
			}
		}
		ytMenu.close();
	});
	const doNotChangeSpeed = cfg.global.speed && cfg.flags.standardMusicSpeed && (await isMusicChannel());
	const settings = Object.assign({},
		cfg.global,
		doNotChangeSpeed && {[SPEED]: SPEED_NORMAL},
		isTheSameChannel && channelCfg
	);
	isSpeedChanged = false;
	restoreFocusAfter(() => {
		for (const setting in settings)
			ytSettingItems[setting as Setting].setValue(settings[setting as Setting], setting);
	});

	/* ---------------------- settings menu ---------------------- */

	if (menuCont) return;

	const
		div = <T extends object>(props?: T) => el('div', props) as HTMLDivElement & T,
		input = <T extends object>(props?: T) => el('input', props) as HTMLInputElement & T,
		checkbox = <T extends object>(props?: T) => input({type: 'checkbox', ...props}),
		labelEl = <T extends object>(forId: string, props?: T) => {
			const elem = el('label', props);
			elem.setAttribute('for', forId);
			return elem as HTMLLabelElement & T;
		},
		btnClass = 'yt-spec-button-shape-next',
		button = <T extends object>(text: string, props?: object) => el('button', Object.assign({
			textContent: text,
			className: `${btnClass} ${btnClass}--tonal ${btnClass}--mono ${btnClass}--size-m`,
			onfocus() {this.classList.add(btnClass + '--focused')},
			onblur() {this.classList.remove(btnClass + '--focused')}
		}, props)) as HTMLButtonElement & T;
	menuCont = div({id: CONT_ID});
	menuCont.style.position = 'relative';
	const menu = div({
		id: MENU_ID,
		isOpen: false,
		closeListener: {
			listener(e: Event) {
				const el = e.target as HTMLElement;
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

	const createSection = (sectionId: string, title: string, sectionCfg: Cfg) => {
		const section = div({role: 'group'});
		section.setAttribute('aria-labelledby', sectionId);
		const addItem = <TElem extends HTMLElement>(
			name: Setting,
			textContent: string,
			elem: TElem
		) => {
			const item = div();
			const id = PREFIX + name + '-' + sectionId;
			const label = labelEl(id, {textContent});
			const valueProp = valueProps[name];
			Object.assign(elem, {
				id,
				name: name,
				onchange() {
					const value = this[valueProp] as string | boolean;
					if (value === '' || value === 'default') delete sectionCfg[name];
					// @ts-ignore
					else sectionCfg[name] = value;
				}
			});
			const cfgValue = sectionCfg[name];
			if (cfgValue) setTimeout(() => {
				// @ts-ignore
				elem[valueProp] = cfgValue;
			});
			item.append(label, elem);
			section.append(item);
			return {elem};
		};

		type ToOptions = (values: readonly string[], getText: (arg: string) => string) => HTMLOptionElement[];

		const toOptions: ToOptions = (values, getText) => {
			const result: HTMLOptionElement[] = Array(values.length + 1);
			result[0] = el('option', {
				value: text.DEFAULT,
				textContent: text.DEFAULT,
				checked: true
			}) as HTMLOptionElement;
			for (let i = 0; i < values.length; i++)
				result[i + 1] = el('option', {
					value: values[i],
					textContent: getText(values[i])
				}) as HTMLOptionElement;
			return result;
		};
		const speedValues = ['2', '1.75', '1.5', '1.25', SPEED_NORMAL, '0.75', '0.5', '0.25'];
		const qualityValues = ['144', '240', '360', '480', '720', '1080', '1440', '2160', '4320'];

		type AddSelectItem = (name: Setting, text: string, ...args: Parameters<ToOptions>) => void;
		const addSelectItem: AddSelectItem = (name, text, options, getText) =>
			addItem(name, text, el('select') as HTMLSelectElement).elem.append(...toOptions(options, getText));

		section.append(el('span', {textContent: title, id: sectionId}));
		addSelectItem(SPEED, text.SPEED, speedValues, val => val);
		addSelectItem(QUALITY, text.QUALITY, qualityValues, val => val + 'p');
		addItem(SUBTITLES, text.SUBTITLES, checkbox());
		return section;
	};

	const sections = div({className: PREFIX + 'sections'});
	sections.append(
		createSection(SECTION.GLOBAL, text.GLOBAL, cfg.global),
		createSection(SECTION.LOCAL, text.LOCAL, channelCfg)
	);
	const checkboxDiv = (id: string, prop: FlagName, text: string) => {
		const cont = div({className: 'check-cont'});
		id = PREFIX + id;
		cont.append(
			labelEl(id, {textContent: text}),
			checkbox({
				id,
				checked: cfg.flags[prop],
				onclick() {cfg.flags[prop] = this.checked}
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
		const el = e.target as HTMLInputElement;
		if (e.code === 'Enter' && el.type === 'checkbox')
			el.checked = !el.checked;
	});

	const settingsIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	const iconStyle = {
		viewBox: '0 0 24 24',
		width: '24', height: '24',
		fill: 'var(--yt-spec-text-primary)'
	};
	for (const key in iconStyle) settingsIcon.setAttribute(key, iconStyle[key as keyof typeof iconStyle]);
	settingsIcon.append($('settings'));
	const btn = button('', {
		id: BTN_ID,
		ariaLabel: text.OPEN_SETTINGS,
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

let lastHref: string;
setInterval(() => {
	if (lastHref === location.href) return;
	lastHref = location.href;
	onPageChange();
}, 1_000);

const onClick = (e: Event) => {
	const {shortsToUsual, newTab} = cfg.flags;
	if (!shortsToUsual && !newTab) return;
	let el = e.target as HTMLAnchorElement;
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

const getCfgValue = (key: Setting) =>
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
	restoreFocusAfter(() => {
		ytSettingItems[setting].setValue(getCfgValue(setting));
	});
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