declare const STORAGE_NAME: 'YTDefaulter',
	STORAGE_VERSION: 4,
	SECTION_GLOBAL: 'global',
	SECTION_LOCAL: 'thisChannel',
	PREFIX: 'YTDef-',
	MENU_ID: 'YTDef-menu',
	BTN_ID: 'YTDef-btn',
	SETTING_HINT_CLASS: 'YTDef-setting-hint',
	SUBTITLES: 'subtitles',
	SPEED: 'speed',
	CUSTOM_SPEED: 'customSpeed',
	QUALITY: 'quality',
	VOLUME: 'volume';

const translations: Record<string, Partial<Dictionary>> = {
	'be-BY': {
		OPEN_SETTINGS: 'Адкрыць дадатковыя налады',
		SUBTITLES: 'Субтытры',
		SPEED: 'Хуткасьць',
		CUSTOM_SPEED: 'Свая хуткасьць',
		CUSTOM_SPEED_HINT:
			'Калі вызначана, будзе выкарыстоўвацца замест "хуткасьць"',
		QUALITY: 'Якасьць',
		VOLUME: 'Гучнасьць, %',
		GLOBAL: 'глябальна',
		LOCAL: 'гэты канал',
		SHORTS: 'Адкрываць shorts як звычайныя',
		NEW_TAB: 'Адкрываць відэа ў новай картцы',
		COPY_SUBS: 'Капіяваць субтытры ў поўнаэкранным, Ctrl+C',
		STANDARD_MUSIC_SPEED: 'Звычайная хуткасьць на каналах музыкаў',
		SAVE: 'Захаваць',
		SAVED: 'Захавана',
	},
};
const text: Dictionary = {
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
	STANDARD_MUSIC_SPEED: 'Normal speed on artist channels',
	SAVE: 'Save',
	SAVED: 'Saved',
	DEFAULT: '-',
	...translations[document.documentElement.lang],
};

const cfgLocalStorage = localStorage[STORAGE_NAME];
const cfg: ScriptCfg = cfgLocalStorage
	? JSON.parse(cfgLocalStorage)
	: {
			_v: STORAGE_VERSION,
			global: {},
			channels: {},
			flags: {
				shortsToUsual: false,
				newTab: false,
				copySubs: false,
				standardMusicSpeed: false,
			},
	  };
const isDescendantOrTheSame = (
	child: Element,
	parents: ParentNode[]
): boolean => {
	if (parents.includes(child)) return true;
	let node = child.parentNode;
	while (node !== null) {
		if (parents.includes(node)) return true;
		node = node.parentNode;
	}
	return false;
};
const saveCfg = () => {
	const cfgCopy = { ...cfg };
	const channelsCfgCopy = { ...cfg.channels };
	outer: for (const key in channelsCfgCopy) {
		const channelCfg = channelsCfgCopy[key];
		if (channelCfg.subtitles) continue;
		for (const cfgKey in channelCfg) if (cfgKey !== 'subtitles') continue outer;
		delete channelsCfgCopy[key];
	}
	cfgCopy.channels = channelsCfgCopy;

	localStorage[STORAGE_NAME] = JSON.stringify(cfgCopy);
};

if (cfg._v !== STORAGE_VERSION) {
	switch (cfg._v) {
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

function debounce<TParams extends any[]>(
	callback: (...args: TParams) => void,
	delay: number
): (...args: TParams) => void {
	let timeout: number;
	return function (...args) {
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

const until = <T>(
	getItem: () => T,
	check: (item: T) => boolean,
	msToWait = 10_000,
	msReqTimeout = 20
) =>
	new Promise<T>((res, rej) => {
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

const untilAppear = <T>(getItem: () => T, msToWait?: number) =>
	until<T>(getItem, Boolean, msToWait);

const ytSettingItems: YtSettingItems = {};
let channelCfg: Partial<Cfg>,
	channelName: string,
	isTheSameChannel = true,
	video: HTMLVideoElement,
	subtitlesBtn: HTMLButtonElement,
	muteBtn: HTMLButtonElement,
	SPEED_NORMAL: string,
	isSpeedChanged = false;

const menu: Menu = {
	element: null,
	isOpen: false,
	width: 0,
	_closeListener: {
		onClick(e: Event) {
			const el = e.target as HTMLElement;
			if (isDescendantOrTheSame(el, [menu.element, menu.btn])) return;
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
	firstElement: null,
	_open() {
		this.fixPosition();
		this.element.style.visibility = 'visible';
		this._closeListener.add();
		this.firstElement.focus();
		this.isOpen = true;
	},
	_close() {
		this.style.visibility = 'hidden';
		this._closeListener.remove();
		this.isOpen = false;
	},
	toggle: debounce(function () {
		if (this.isOpen) this._close();
		else this._open();
	}, 100),
	fixPosition() {
		const { y, height, width, left } = this.btn.getBoundingClientRect();
		this.style.top = y + height + 8 + 'px';
		this.style.left = left + width - this.width + 'px';
	},
	btn: null,
};

const $ = (id: string) => document.getElementById(id);

const getChannelName = () =>
	new URLSearchParams(location.search).get('ab_channel');
const getChannelUsername = () =>
	document
		.querySelector<HTMLLinkElement>(
			'span[itemprop="author"] > link[itemprop="url"]'
		)
		?.href.replace(/.*\/@/, '');

const getPlr = () => $('movie_player');
const getAboveTheFold = () => $('above-the-fold');
const getActionsBar = () => $('actions')?.querySelector('ytd-menu-renderer');

const iconD = {
	[QUALITY]:
		'M15,17h6v1h-6V17z M11,17H3v1h8v2h1v-2v-1v-2h-1V17z M14,8h1V6V5V3h-1v2H3v1h11V8z            M18,5v1h3V5H18z M6,14h1v-2v-1V9H6v2H3v1 h3V14z M10,12h11v-1H10V12z',
	[SPEED]:
		'M10,8v8l6-4L10,8L10,8z M6.3,5L5.7,4.2C7.2,3,9,2.2,11,2l0.1,1C9.3,3.2,7.7,3.9,6.3,5z            M5,6.3L4.2,5.7C3,7.2,2.2,9,2,11 l1,.1C3.2,9.3,3.9,7.7,5,6.3z            M5,17.7c-1.1-1.4-1.8-3.1-2-4.8L2,13c0.2,2,1,3.8,2.2,5.4L5,17.7z            M11.1,21c-1.8-0.2-3.4-0.9-4.8-2 l-0.6,.8C7.2,21,9,21.8,11,22L11.1,21z            M22,12c0-5.2-3.9-9.4-9-10l-0.1,1c4.6,.5,8.1,4.3,8.1,9s-3.5,8.5-8.1,9l0.1,1 C18.2,21.5,22,17.2,22,12z',
} satisfies Record<YtSettingName, string>;
const getYtElementFinderInArray =
	<TElem extends HTMLElement>(elems: TElem[]) =>
	(name: YtSettingName) =>
		elems.find((el) => el.querySelector(`path[d="${iconD[name]}"]`));

const untilChannelUsernameAppear = () =>
	untilAppear(getChannelUsername).catch(() => '');

const isMusicChannel = () =>
	untilAppear(getAboveTheFold).then(
		(el) => !!el.querySelector('.badge-style-type-verified-artist')
	);

const ytMenu: YtMenu = {
	updatePlayer(plr: HTMLElement) {
		this.element = plr.querySelector('.ytp-settings-menu');
		this._btn = plr.querySelector('.ytp-settings-button');
		restoreFocusAfter(() => {
			this._btn.click();
			this._btn.click();
		});
	},
	element: null,
	_btn: null,
	_isOpen() {
		return this.element.style.display !== 'none';
	},
	open() {
		if (!this._isOpen()) this._btn.click();
	},
	close() {
		if (this._isOpen()) this._btn.click();
	},
	openItem(item) {
		this.open();
		item.click();
		return this.element.querySelectorAll<HTMLElement>(
			'.ytp-panel-animate-forward .ytp-menuitem-label'
		);
	},
};

type YtSettingName = typeof SPEED | typeof QUALITY;
type YtSettingItems = Partial<Record<YtSettingName, YtSettingItem>>;

const validateVolume = (value: string) => {
	const num = +value;
	return num < 0 || num > 100
		? 'out of range'
		: isNaN(num)
		? 'not a number'
		: false;
};

type Props<T extends HTMLElement> = Partial<T> & object;
const getElCreator =
	<TTag extends keyof HTMLElementTagNameMap>(tag: TTag) =>
	<TProps extends Props<HTMLElementTagNameMap[TTag]>>(props?: TProps) =>
		Object.assign(document.createElement(tag), props);
type Comparator = (value: string, current: string) => boolean;
const comparators: Record<YtSettingName, Comparator> = {
	[QUALITY]: (value, current) => +value >= parseInt(current),
	[SPEED]: (value, current) => value === current,
};
const logger = {
	prefix: '[YT-Defaulter]',
	// log(...msgs: string[]) {
	// 	console.log(this.prefix, ...msgs);
	// },
	err(...msgs: string[]) {
		console.error(this.prefix, ...msgs);
	},
	outOfRange(what: string) {
		this.err(what, 'value is out of range');
	},
};
type ValueSetterHelpers = {
	_ytSettingItem(value: string, settingName: YtSettingName): void;
};
type ValueSetters = { [p in Setting]: (value: Cfg[p]) => void };
const valueSetters: ValueSetters & ValueSetterHelpers = {
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
		} catch {
			logger.outOfRange('Custom speed');
			return;
		}
		isSpeedChanged = !isSpeedChanged;
	},
	subtitles(value) {
		if (subtitlesBtn.ariaPressed !== value.toString()) subtitlesBtn.click();
	},
	volume(value) {
		const num = +value;
		muteBtn ||= document.querySelector<HTMLButtonElement>('.ytp-mute-button');
		const isMuted = muteBtn.dataset.titleNoTooltip !== 'Mute';
		if (num === 0) {
			if (!isMuted) muteBtn.click();
			return;
		}
		if (isMuted) muteBtn.click();
		try {
			video.volume = num / 100;
		} catch {
			logger.outOfRange('Volume');
		}
	},
	quality(value) {
		this._ytSettingItem(value, QUALITY);
	},
};
const updateMenuVisibility = async () => {
	const name = await untilAppear(getChannelName);
	if (menu.btn) {
		isTheSameChannel = channelName === name;
		menu.btn.style.display = isTheSameChannel ? 'flex' : 'none';
	} else {
		channelName = name;
	}
};
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
const onPageChange = async () => {
	if (location.pathname !== '/watch') return;

	/* ---------------------- apply settings ---------------------- */

	await updateMenuVisibility();

	if (!channelCfg) {
		const channelUsername = await untilChannelUsernameAppear();
		channelCfg = cfg.channels[channelUsername] ||= {};
	}

	const plr = await untilAppear(getPlr);
	await delay(1_000);
	const getAd = () => plr.querySelector('.ytp-ad-player-overlay');
	if (getAd()) await until(getAd, (ad) => !ad, 200_000);
	ytMenu.updatePlayer(plr);
	const getMenuItems = () =>
		ytMenu.element.querySelectorAll<YtSettingItem>(
			'.ytp-menuitem[role="menuitem"]'
		);
	const menuItemArr = Array.from(
		await until(getMenuItems, (arr) => !!arr.length)
	);
	const getYtElement = getYtElementFinderInArray(menuItemArr);
	Object.assign(ytSettingItems, {
		quality: getYtElement(QUALITY),
		speed: getYtElement(SPEED),
	} satisfies YtSettingItems);
	if (!SPEED_NORMAL)
		restoreFocusAfter(() => {
			for (const { textContent } of ytMenu.openItem(ytSettingItems.speed))
				if (!+textContent) {
					SPEED_NORMAL = textContent;
					break;
				}
		});
	const doNotChangeSpeed =
		cfg.flags.standardMusicSpeed && (await isMusicChannel());
	const settings = {
		...cfg.global,
		...(isTheSameChannel && channelCfg),
	};
	if (isTheSameChannel) {
		const isChannelSpeed = 'speed' in channelCfg;
		const isChannelCustomSpeed = 'customSpeed' in channelCfg;
		if ((doNotChangeSpeed && !isChannelCustomSpeed) || isChannelSpeed)
			delete settings.customSpeed;
		if (doNotChangeSpeed && !isChannelSpeed) settings.speed = SPEED_NORMAL;
	} else if (doNotChangeSpeed) {
		settings.speed = SPEED_NORMAL;
		delete settings.customSpeed;
	}
	const { customSpeed } = settings;
	delete settings.customSpeed;
	isSpeedChanged = false;
	video ||= plr.querySelector('.html5-main-video');
	subtitlesBtn ||= plr.querySelector('.ytp-subtitles-button');
	restoreFocusAfter(() => {
		for (const setting in settings)
			valueSetters[setting as Setting](settings[setting as never]);
		if (!isNaN(+customSpeed)) {
			isSpeedChanged = false;
			valueSetters.customSpeed(customSpeed);
		}
		ytMenu.close();
	});

	/* ---------------------- settings menu ---------------------- */

	if (menu.element) return;

	const div = getElCreator('div'),
		input = getElCreator('input'),
		checkbox = <T extends Props<HTMLInputElement>>(props?: T) =>
			input({ type: 'checkbox', ...props }),
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
		button = <T extends Props<HTMLButtonElement>>(text: string, props?: T) =>
			_button({
				textContent: text,
				className: `${btnClass} ${btnClass}--tonal ${btnClass}--mono ${btnClass}--size-m`,
				onfocus(this: HTMLButtonElement) {
					this.classList.add(btnClass + '--focused');
				},
				onblur(this: HTMLButtonElement) {
					this.classList.remove(btnClass + '--focused');
				},
				...props,
			});
	menu.element = div({
		id: MENU_ID,
	});
	menu.btn = button('', {
		id: BTN_ID,
		ariaLabel: text.OPEN_SETTINGS,
		tabIndex: 0,
		onclick() {
			menu.toggle();
		},
	});
	type ToOptions = (
		values: readonly string[],
		getText: (arg: string) => string
	) => HTMLOptionElement[];

	const toOptions: ToOptions = (values, getText) =>
		[
			option({
				value: text.DEFAULT,
				textContent: text.DEFAULT,
			}),
		].concat(
			values.map((value) =>
				option({
					value: value,
					textContent: getText(value),
				})
			)
		);

	const speedValues = [
		'2',
		'1.75',
		'1.5',
		'1.25',
		SPEED_NORMAL,
		'0.75',
		'0.5',
		'0.25',
	];
	const qualityValues = [
		'144',
		'240',
		'360',
		'480',
		'720',
		'1080',
		'1440',
		'2160',
		'4320',
	];

	const createSection = (
		sectionId: string,
		title: string,
		sectionCfg: Cfg
	): HTMLDivElement => {
		const section = div({ role: 'group' });
		section.setAttribute('aria-labelledby', sectionId);
		const getLocalId = (name: string) => PREFIX + name + '-' + sectionId;
		type Item = (HTMLInputElement | HTMLSelectElement) & { hint?: HTMLElement };

		const addItem = <TElem extends Item>(
			name: Setting,
			innerHTML: string,
			elem: TElem
		) => {
			const item = div();
			const id = getLocalId(name);
			const label = labelEl(id, { innerHTML });
			const valueProp = elem.type === 'checkbox' ? 'checked' : 'value';
			Object.assign(elem, {
				id,
				name: name,
				onchange(this: TElem & { checked: boolean; value: string }) {
					const value: Cfg[Setting] = this[valueProp];
					if (value === '' || value === text.DEFAULT) delete sectionCfg[name];
					else sectionCfg[name] = value as never;
				},
			} satisfies Partial<HTMLInputElement & HTMLSelectElement>);
			const cfgValue = sectionCfg[name];
			if (cfgValue)
				setTimeout(() => {
					(elem as any)[valueProp] = cfgValue;
				});
			item.append(label, elem);
			section.append(item);
			if (elem.hint) section.append(elem.hint);
			return { elem };
		};

		type AddSelectItem = (
			name: Setting,
			text: string,
			...args: Parameters<ToOptions>
		) => HTMLSelectElement;
		const addSelectItem: AddSelectItem = (name, label, options, getText) => {
			const { elem } = addItem(name, label, selectEl({ value: text.DEFAULT }));
			elem.append(...toOptions(options, getText));
			return elem;
		};

		section.append(getElCreator('span')({ textContent: title, id: sectionId }));
		const createHint = <TProps extends Props<HTMLDivElement>>(
			prefix: string,
			props?: TProps
		) => {
			const el: HintElem & TProps = div({
				className: SETTING_HINT_CLASS,
				hide() {
					this.style.display = 'none';
				},
				show(msg?: string) {
					this.style.display = 'block';
					if (msg) this.textContent = prefix + msg;
				},
				...props,
			});
			el.hide();
			return el;
		};
		const firstElement = addSelectItem(
			SPEED,
			text.SPEED,
			speedValues,
			(val) => val
		);
		if (sectionId === SECTION_GLOBAL) menu.firstElement = firstElement;
		addItem(
			CUSTOM_SPEED,
			text.CUSTOM_SPEED,
			input({
				type: 'number',
				onfocus(this: InputWithHint) {
					this.hint.show();
				},
				onblur(this: InputWithHint) {
					this.hint.hide();
				},
				hint: createHint(null, { textContent: text.CUSTOM_SPEED_HINT }),
			})
		);
		addSelectItem(QUALITY, text.QUALITY, qualityValues, (val) => val + 'p');
		addItem(
			VOLUME,
			text.VOLUME,
			input({
				type: 'number',
				min: '0',
				max: '100',
				oninput(this: InputWithHint) {
					settings.volume = this.value;
					const warning = validateVolume(this.value);
					if (warning) {
						this.hint.show(warning);
					} else {
						this.hint.hide();
					}
				},
				hint: createHint('Warning: '),
			})
		);
		addItem(SUBTITLES, text.SUBTITLES, checkbox());
		return section;
	};

	const sections = div({ className: PREFIX + 'sections' });
	sections.append(
		createSection(SECTION_GLOBAL, text.GLOBAL, cfg.global),
		createSection(SECTION_LOCAL, text.LOCAL, channelCfg)
	);
	const checkboxDiv = (
		id: string,
		prop: FlagName,
		text: string
	): HTMLDivElement => {
		const cont = div({ className: 'check-cont' });
		id = PREFIX + id;
		cont.append(
			labelEl(id, { textContent: text }),
			checkbox({
				id,
				checked: cfg.flags[prop],
				onclick(this: HTMLInputElement) {
					cfg.flags[prop] = this.checked;
				},
			})
		);
		return cont;
	};

	type SaveButton = Props<HTMLButtonElement> & {
		setTextDefer: (text: string) => void;
	};
	menu.element.append(
		sections,
		checkboxDiv('shorts', 'shortsToUsual', text.SHORTS),
		checkboxDiv('new-tab', 'newTab', text.NEW_TAB),
		checkboxDiv('copy-subs', 'copySubs', text.COPY_SUBS),
		checkboxDiv(
			'standard-music-speed',
			'standardMusicSpeed',
			text.STANDARD_MUSIC_SPEED
		),
		button(text.SAVE, {
			setTextDefer: debounce(function (text: string) {
				this.textContent = text;
			}, 1000),
			onclick(this: SaveButton) {
				saveCfg();
				this.textContent = text.SAVED;
				this.setTextDefer(text.SAVE);
			},
		} as SaveButton)
	);
	menu.element.addEventListener('keyup', (e) => {
		const el = e.target as HTMLInputElement;
		if (e.code === 'Enter' && el.type === 'checkbox') el.checked = !el.checked;
	});

	const settingsIcon = document.createElementNS(
		'http://www.w3.org/2000/svg',
		'svg'
	);
	const iconStyle = {
		viewBox: '0 0 24 24',
		width: '24',
		height: '24',
		fill: 'var(--yt-spec-text-primary)',
	};
	for (const key in iconStyle)
		settingsIcon.setAttribute(key, iconStyle[key as keyof typeof iconStyle]);
	settingsIcon.append($('settings'));
	menu.btn.setAttribute('aria-controls', MENU_ID);
	menu.btn.classList.add(btnClass + '--icon-button');
	menu.btn.append(settingsIcon);
	const actionsBar = await untilAppear(getActionsBar);
	actionsBar.insertBefore(menu.btn, actionsBar.lastChild);
	document.querySelector('ytd-popup-container').append(menu.element);
	menu.width = menu.element.getBoundingClientRect().width;
	sections.style.maxWidth = sections.offsetWidth + 'px';
};

let lastHref: string;
setInterval(() => {
	if (lastHref === location.href) return;
	lastHref = location.href;
	onPageChange();
}, 1_000);

const onClick = (e: Event) => {
	const { shortsToUsual, newTab } = cfg.flags;
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

document.addEventListener('click', onClick, { capture: true });
document.addEventListener(
	'keyup',
	(e) => {
		if (e.code === 'Enter') return onClick(e);
		if (!e.ctrlKey) return;
		if (cfg.flags.copySubs && e.code === 'KeyC') {
			const plr = document.querySelector('.html5-video-player');
			if (!plr?.classList.contains('ytp-fullscreen')) return;
			const text = Array.from(
				plr.querySelectorAll('.captions-text > span'),
				(line) => line.textContent
			).join(' ');
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
			const value =
				isTheSameChannel && channelCfg
					? channelCfg.customSpeed ||
					  (!channelCfg.speed && cfg.global.customSpeed)
					: cfg.global.customSpeed;
			if (value) return valueSetters.customSpeed(value);
			setting = SPEED;
		}
		restoreFocusAfter(() => {
			valueSetters[setting](
				((isTheSameChannel && channelCfg) || cfg.global)[setting] as never
			);
		});
	},
	{ capture: true }
);
const listener = () => {
	if (menu.isOpen) menu.fixPosition();
};
window.addEventListener('scroll', listener);
window.addEventListener('resize', listener);

const m = '#' + MENU_ID,
	d = ' div',
	i = ' input',
	s = ' select',
	bg = 'var(--yt-spec-menu-background)',
	underline = 'border-bottom: 2px solid var(--yt-spec-text-primary);';

document.head.append(
	getElCreator('style')({
		textContent: `
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
${
	m + d + d + d
}:focus-within > label, ${m} .check-cont:focus-within > label {${underline}}
${m} .check-cont {padding: 0 1rem}
${m + s} {appearance: none; outline: none}
${m} label {margin-right: 1.5rem; white-space: nowrap}
${m + i}::-webkit-outer-spin-button,
${m + i}::-webkit-inner-spin-button {-webkit-appearance: none; margin: 0}
${m + i}[type=number] {-moz-appearance: textfield}
${m + s}::-ms-expand {display: none}`,
	})
);
