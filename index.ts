const
	STORAGE_NAME = 'YTDefaulter',
	STORAGE_VERSION = 4,
	SECTION_GLOBAL = 'global',
	SECTION_LOCAL = 'thisChannel',
	PREFIX = 'YTDef-',
	MENU_ID = PREFIX + 'menu',
	BTN_ID = PREFIX + 'btn',
	CUSTOM_SPEED_HINT_CLASS = PREFIX + 'custom-speed-hint',
	SUBTITLES = 'subtitles',
	SPEED = 'speed',
	CUSTOM_SPEED = 'customSpeed',
	QUALITY = 'quality';
const text = {
	OPEN_SETTINGS: 'Open additional settings',
	SUBTITLES: 'Subtitles',
	SPEED: 'Speed',
	CUSTOM_SPEED: 'Custom speed',
	CUSTOM_SPEED_HINT: 'If defined, will be used instead of "speed"',
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
		CUSTOM_SPEED: 'Свая хуткасьць',
		CUSTOM_SPEED_HINT: 'Калі вызначана, будзе выкарыстоўвацца замест "хуткасьць"',
		QUALITY: 'Якасьць',
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

type FlagName = 'shortsToUsual' | 'newTab' | 'copySubs' | 'standardMusicSpeed';
type YTCfg = {
	speed?: string,
	quality?: string,
	subtitles?: boolean
};
type Cfg = YTCfg & {
	customSpeed?: string
};
type Setting = keyof Cfg;
type YTSetting = keyof YTCfg;
type ScriptCfg = {
	_v: number,
	global: Cfg,
	channels: Record<string, Cfg>,
	flags: Record<FlagName, boolean>
};
const cfgLocalStorage = localStorage[STORAGE_NAME];
const cfg: ScriptCfg = cfgLocalStorage ? JSON.parse(cfgLocalStorage) : {
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
const isDescendantOrTheSame = (child: Element, parents: ParentNode[]): boolean => {
	if (parents.includes(child)) return true;
	let node = child.parentNode as Element;
	while (node !== null) {
		if (parents.includes(node)) return true;
		node = node.parentNode as Element;
	}
	return false;
}
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

	localStorage[STORAGE_NAME] = JSON.stringify(cfgCopy);
};

if (cfg._v !== STORAGE_VERSION)  {
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
			cfg._v = STORAGE_VERSION;
	}
	saveCfg();
}

function debounce<T extends (...args: any[]) => any>(callback: T, delay: number) {
	let timeout: number;
	return function(...args: Parameters<T>) {
		clearTimeout(timeout);
		timeout = window.setTimeout(() => {
			callback.apply(this, args);
		}, delay);
	};
}
const restoreFocusAfter = (cb: () => void) => {
	const el = document.activeElement as HTMLElement;
	cb();
	el.focus();
};

const until = <TGetter extends () => any>(
	getItem: TGetter,
	check: (item: ReturnType<TGetter>) => boolean,
	msToWait = 10_000,
	msReqTimeout = 20
) => new Promise<ReturnType<TGetter>>((res, rej) => {
	const reqLimit = msToWait / msReqTimeout;
	let i = 0;
	const interval = setInterval(() => {
		if (i++ > reqLimit) exit(rej);
		const item = getItem();
		if (!check(item)) return;
		exit(() => res(item));
	}, msReqTimeout);
	const exit = (cb: () => void) => {
		clearInterval(interval);
		cb();
	};
});

const untilAppear = <TGetter extends () => any>(getItem: TGetter, msToWait?: number) =>
	until(getItem, Boolean, msToWait);

type Menu = HTMLDivElement & {
	isOpen: boolean,
	btn: HTMLButtonElement,
	width: number,
	closeListener: {
		onClick(e: Event): void,
		onKeyUp(e: KeyboardEvent): void,
		add(): void,
		remove(): void
	},
	_open(): void,
	_close(): void,
	toggle(): void,
	fixPosition(): void
};

let
	channelCfg: Partial<Cfg>,
	channelName: string,

	isTheSameChannel = true,
	video: HTMLVideoElement,

	ytMenu: YtMenu,
	ytSettingItems: YtSettingItems,

	menu: Menu,

	SPEED_NORMAL: string,
	isSpeedChanged = false;

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
type YtMenu = HTMLElement & YtMenuApi;
type ValueSetter = (value: string | boolean) => void;
type YtSettingItemElem = HTMLDivElement;
type YtSettingItem = YtSettingItemElem & {setValue: ValueSetter, setting: YTSetting};
type YtSettingItems = Partial<Record<YTSetting, YtSettingItem>>;


type Props<T extends HTMLElement> = Partial<T> & object;
const
	addValueSetter = <TElem extends HTMLElement>(el: TElem, setValue: ValueSetter, setting: YTSetting) =>
		Object.assign(el, {setValue, setting}),
	getElCreator = <TTag extends keyof HTMLElementTagNameMap>(tag: TTag) =>
		<TProps extends Props<HTMLElementTagNameMap[TTag]>>(props?: TProps) => Object.assign(document.createElement(tag), props);
const comparators = {
	[QUALITY]: (value: string, current: string) => +value >= parseInt(current),
	[SPEED]: (value: string, current: string) => value === current
} as const;
function setValue(value: string) {
	const compare = comparators[this.setting as keyof typeof comparators];

	for (const btn of ytMenu.openItem(this))
		if (compare(value, btn.textContent)) {
			btn.click();
			break;
		}

	ytMenu.close();
}
const setCustomSpeed = (value: number) => {
	try {
		video.playbackRate = isSpeedChanged ? 1 : value;
		isSpeedChanged = !isSpeedChanged;
	} catch {
		throw 'Custom speed value is out of range';
	}
};
function setSpeedValue(value: string) {
	setValue.apply(this, [isSpeedChanged ? SPEED_NORMAL : value]);
	isSpeedChanged = !isSpeedChanged;
}
function setSubtitlesValue(value: boolean) {
	if (this.ariaPressed !== value.toString()) this.click();
}
const updateMenuVisibility = async () => {
	const name = await untilAppear(getChannelName);
	if (menu.btn) {
		isTheSameChannel = channelName === name;
		menu.btn.style.display = isTheSameChannel ? 'flex' : 'none';
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
	ytMenu = Object.assign(plr.querySelector<HTMLElement>('.ytp-settings-menu'), {
		_btn: plr.querySelector('.ytp-settings-button'),
		isOpen() {return this.style.display !== 'none'},
		open()  {this.isOpen() || this._btn.click()},
		close() {this.isOpen() && this._btn.click()},
		openItem(item) {
			this.open();
			item.click();
			return Array.from(this.querySelectorAll('.ytp-panel-animate-forward .ytp-menuitem-label'));
		}
	} as YtMenuApi);
	restoreFocusAfter(() => {
		ytMenu.open();
		ytMenu.close();
	});
	const getMenuItems = () =>
		ytMenu.querySelectorAll('.ytp-menuitem[role="menuitem"]') as NodeListOf<YtSettingItemElem>;
	const menuItemArr = Array.from(
		await until(getMenuItems, arr => !!arr.length)
	);
	const areSubtitles = menuItemArr.length === 3;
	ytSettingItems = {
		[QUALITY]: addValueSetter(menuItemArr.at(-1), setValue, QUALITY),
		[SPEED]: addValueSetter(menuItemArr[0], setSpeedValue, SPEED)
	};
	if (areSubtitles) ytSettingItems[SUBTITLES] = addValueSetter(
		plr.querySelector('.ytp-subtitles-button'), setSubtitlesValue, SUBTITLES
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
	const doNotChangeSpeed = cfg.flags.standardMusicSpeed && (await isMusicChannel());
	const settings = Object.assign({},
		cfg.global, isTheSameChannel && channelCfg
	);
	if (isTheSameChannel) {
		const isChannelSpeed = 'speed' in channelCfg;
		const isChannelCustomSpeed = 'customSpeed' in channelCfg;
		if (isChannelCustomSpeed && isChannelSpeed || doNotChangeSpeed)
			delete settings.customSpeed;
		if (doNotChangeSpeed && !isChannelSpeed)
			delete settings.speed;
	} else if (doNotChangeSpeed) {
		delete settings.speed;
		delete settings.customSpeed;
	}
	const customSpeed = +settings.customSpeed;
	delete settings.customSpeed;
	isSpeedChanged = false;
	restoreFocusAfter(() => {
		for (const setting in settings)
			ytSettingItems[setting as YTSetting].setValue(settings[setting as YTSetting]);
	});
	if (!isNaN(customSpeed)) {
		isSpeedChanged = false;
		video ||= plr.querySelector<HTMLVideoElement>('.html5-main-video');
		setCustomSpeed(customSpeed);
	}

	/* ---------------------- settings menu ---------------------- */

	if (menu) return;

	const
		div = getElCreator('div'),
		input = getElCreator('input'),
		checkbox = <T extends Props<HTMLInputElement>>(props?: T) => input({type: 'checkbox', ...props}),
		option = getElCreator('option'),
		_label = getElCreator('label'),
		labelEl = <T extends Props<HTMLLabelElement>>(forId: string, props?: T) => {
			const elem = _label(props);
			elem.setAttribute('for', forId);
			return elem;
		},
		selectEl = getElCreator('select'),
		btnClass = 'yt-spec-button-shape-next',
		_button = getElCreator('button'),
		button = <T extends Props<HTMLButtonElement>>(text: string, props?: T) => _button(Object.assign({
			textContent: text,
			className: `${btnClass} ${btnClass}--tonal ${btnClass}--mono ${btnClass}--size-m`,
			onfocus() {this.classList.add(btnClass + '--focused')},
			onblur() {this.classList.remove(btnClass + '--focused')}
		}, props));
	menu = div({
		id: MENU_ID,
		isOpen: false,
		width: 0,
		closeListener: {
			onClick(e: Event) {
				const el = e.target as HTMLElement;
				if (isDescendantOrTheSame(el, [menu, menu.btn])) return;
				menu.toggle();
			},
			onKeyUp(e) {
				if (e.code !== 'Escape') return;
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
		toggle: debounce(function() {
			if (this.isOpen) this._close()
			else this._open();
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
			onclick() {menu.toggle()}
		})
	});

	const createSection = (sectionId: string, title: string, sectionCfg: Cfg) => {
		const section = div({role: 'group'});
		section.setAttribute('aria-labelledby', sectionId);
		const getLocalId = (name: string) => PREFIX + name + '-' + sectionId;
		const addItem = <TElem extends HTMLInputElement | HTMLSelectElement>(
			name: Setting,
			innerHTML: string,
			elem: TElem
		) => {
			const item = div();
			const id = getLocalId(name);
			const label = labelEl(id, {innerHTML});
			const valueProp = elem.type === 'checkbox' ? 'checked' : 'value';
			Object.assign(elem, {
				id,
				name: name,
				onchange() {
					const value: string | boolean = (this as any)[valueProp];
					if (value === '' || value === text.DEFAULT) delete sectionCfg[name];
					else (sectionCfg as any)[name] = value;
				}
			} as Partial<HTMLInputElement & HTMLSelectElement>);
			const cfgValue = sectionCfg[name];
			if (cfgValue) setTimeout(() => {
				(elem as any)[valueProp] = cfgValue;
			});
			item.append(label, elem);
			section.append(item);
			return {elem};
		};

		type ToOptions = (values: readonly string[], getText: (arg: string) => string) => HTMLOptionElement[];

		const toOptions: ToOptions = (values, getText) =>
			[option({
				value: text.DEFAULT,
				textContent: text.DEFAULT
			})].concat(values.map(value => option({
				value: value,
				textContent: getText(value)
			})));
		const speedValues = ['2', '1.75', '1.5', '1.25', SPEED_NORMAL, '0.75', '0.5', '0.25'];
		const qualityValues = ['144', '240', '360', '480', '720', '1080', '1440', '2160', '4320'];

		type AddSelectItem = (name: Setting, text: string, ...args: Parameters<ToOptions>) => void;
		const addSelectItem: AddSelectItem = (name, label, options, getText) =>
			addItem(name, label, selectEl({value: text.DEFAULT}))
				.elem.append(...toOptions(options, getText));

		section.append(getElCreator('span')({textContent: title, id: sectionId}));
		const customSpeedHint = div({
			className: CUSTOM_SPEED_HINT_CLASS,
			textContent: text.CUSTOM_SPEED_HINT,
			hide() {this.style.display = 'none'},
			show() {this.style.display = 'block'}
		});
		customSpeedHint.hide();
		addSelectItem(SPEED, text.SPEED, speedValues, val => val);
		addItem(CUSTOM_SPEED, text.CUSTOM_SPEED, input({
			onfocus() {customSpeedHint.show()},
			onblur() {customSpeedHint.hide()}
		}));
		section.append(customSpeedHint);
		addSelectItem(QUALITY, text.QUALITY, qualityValues, val => val + 'p');
		addItem(SUBTITLES, text.SUBTITLES, checkbox());
		return section;
	};

	const sections = div({className: PREFIX + 'sections'});
	sections.append(
		createSection(SECTION_GLOBAL, text.GLOBAL, cfg.global),
		createSection(SECTION_LOCAL, text.LOCAL, channelCfg)
	);
	const checkboxDiv = (id: string, prop: FlagName, text: string) => {
		const cont = div({className: 'check-cont'});
		id = PREFIX + id;
		cont.append(
			labelEl(id, {textContent: text}),
			checkbox({
				id,
				checked: cfg.flags[prop],
				onclick() {cfg.flags[prop] = (this as HTMLInputElement).checked}
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
			setTextDefer: debounce(function(text: string) {
				this.textContent = text
			}, 1000),
			onclick() {
				saveCfg();
				(this as HTMLButtonElement).textContent = text.SAVED;
				(this as any).setTextDefer(text.SAVE);
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
	menu.btn.setAttribute('aria-controls', MENU_ID);
	menu.btn.classList.add(btnClass + '--icon-button');
	menu.btn.append(settingsIcon);
	const actionsBar = await untilAppear(getActionsBar);
	actionsBar.insertBefore(menu.btn, actionsBar.lastChild);
	document.querySelector('ytd-popup-container').append(menu);
	menu.width = menu.getBoundingClientRect().width;
	sections.style.maxWidth = sections.offsetWidth + 'px';
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
	e.stopPropagation();
	e.preventDefault();
	let setting: YTSetting;
	if (e.shiftKey) {
		setting = QUALITY;
	} else {
		const value = channelCfg?.customSpeed || (!channelCfg?.speed && cfg.global.customSpeed);
		if (value) return setCustomSpeed(+value);
		setting = SPEED;
	}
	restoreFocusAfter(() => {
		ytSettingItems[setting].setValue(getCfgValue(setting));
	});
});
const listener = () => {
	if (menu?.isOpen) menu.fixPosition();
};
window.addEventListener('scroll', listener);
window.addEventListener('resize', listener);

const
	m = '#' + MENU_ID,
	d = ' div', i = ' input', s = ' select', bg = 'var(--yt-spec-menu-background)',
	underline = 'border-bottom: 2px solid var(--yt-spec-text-primary);';

document.head.append(getElCreator('style')({textContent:`
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
${m+d} {display: flex; margin-bottom: 1rem}
${m+d+d} {
flex-direction: column;
margin: 0 2rem
}
${m+d+d+d} {
flex-direction: row;
margin: 1rem 0
}
${m+s}, ${m+i} {
text-align: center;
background: ${bg};
border: none;
${underline}
color: inherit;
width: 5rem;
padding: 0;
margin-left: auto
}
${m} .${CUSTOM_SPEED_HINT_CLASS} {margin: 0; text-align: end}
${m+i} {outline: none}
${m+d+d+d}:focus-within > label, ${m} .check-cont:focus-within > label {${underline}}
${m} .check-cont {padding: 0 1rem}
${m+s} {appearance: none; outline: none}
${m} label {margin-right: 1.5rem; white-space: nowrap}
${m+i}::-webkit-outer-spin-button,
${m+i}::-webkit-inner-spin-button {-webkit-appearance: none; margin: 0}
${m+i}[type=number] {-moz-appearance: textfield}
${m+s}::-ms-expand {display: none}`}));