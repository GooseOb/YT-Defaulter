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

const translations: Record<string, Partial<typeof text>> = {
	'be-BY': {
		OPEN_SETTINGS: 'Адкрыць дадатковыя налады',
		SUBTITLES: 'Субтытры',
		SPEED: 'Хуткасьць',
		CUSTOM_SPEED: 'Свая хуткасьць',
		CUSTOM_SPEED_HINT:
			'Калі вызначана, будзе выкарыстоўвацца замест "Хуткасьць"',
		QUALITY: 'Якасьць',
		VOLUME: 'Гучнасьць, %',
		GLOBAL: 'глябальна',
		LOCAL: 'гэты канал',
		SHORTS: 'Адкрываць shorts як звычайныя',
		NEW_TAB: 'Адкрываць відэа ў новай картцы',
		COPY_SUBS: 'Капіяваць субтытры ў поўнаэкранным, Ctrl+C',
		STANDARD_MUSIC_SPEED: 'Звычайная хуткасьць на каналах музыкаў',
		ENHANCED_BITRATE: 'Палепшаны бітрэйт (для карыстальнікаў Premium)',
		SAVE: 'Захаваць',
		EXPORT: 'Экспарт',
		IMPORT: 'Імпарт',
	},
};
const text = {
	OPEN_SETTINGS: 'Open additional settings',
	SUBTITLES: 'Subtitles',
	SPEED: 'Speed',
	CUSTOM_SPEED: 'Custom speed',
	CUSTOM_SPEED_HINT: 'If defined, will be used instead of "Speed"',
	QUALITY: 'Quality',
	VOLUME: 'Volume, %',
	GLOBAL: 'global',
	LOCAL: 'this channel',
	SHORTS: 'Open shorts as a usual video',
	NEW_TAB: 'Open videos in a new tab',
	COPY_SUBS: 'Copy subtitles by Ctrl+C in fullscreen mode',
	STANDARD_MUSIC_SPEED: 'Normal speed on artist channels',
	ENHANCED_BITRATE: 'Quality: Enhanced bitrate (for Premium users)',
	SAVE: 'Save',
	DEFAULT: '-',
	EXPORT: 'Export',
	IMPORT: 'Import',
};
Object.assign(text, translations[document.documentElement.lang]);

const cfgLocalStorage = localStorage[STORAGE_NAME];
let cfg: ScriptCfg = cfgLocalStorage
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
				enhancedBitrate: false,
			},
		};
const isDescendantOrTheSame = (
	child: Readonly<Element | ParentNode>,
	parents: readonly Readonly<ParentNode>[]
): boolean => {
	while (child !== null) {
		if (parents.includes(child)) return true;
		child = child.parentNode;
	}
	return false;
};

const saveCfg = (cfg: DeepReadonly<ScriptCfg>) => {
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

const updateValuesIn = (controls: SettingControls, cfgPart: Readonly<Cfg>) => {
	controls[SPEED].value = cfgPart[SPEED] || text.DEFAULT;
	controls[CUSTOM_SPEED].value = cfgPart[CUSTOM_SPEED] || '';
	controls[QUALITY].value = cfgPart[QUALITY] || text.DEFAULT;
	controls[VOLUME].value = cfgPart[VOLUME] || '';
	(controls[SUBTITLES] as HTMLInputElement).checked =
		cfgPart[SUBTITLES] || false;
};

const channelControls = () =>
	({
		[SPEED]: null as HTMLSelectElement,
		[CUSTOM_SPEED]: null as HTMLInputElement,
		[QUALITY]: null as HTMLSelectElement,
		[VOLUME]: null as HTMLInputElement,
		[SUBTITLES]: null as HTMLInputElement,
	}) satisfies SettingControls;

const menuControls = {
	global: channelControls(),
	thisChannel: channelControls(),
	flags: {
		shortsToUsual: null as HTMLInputElement,
		newTab: null as HTMLInputElement,
		copySubs: null as HTMLInputElement,
		standardMusicSpeed: null as HTMLInputElement,
		enhancedBitrate: null as HTMLInputElement,
	} satisfies Record<FlagName, HTMLInputElement>,
	updateThisChannel() {
		updateValuesIn(this.thisChannel, channelConfig);
	},
	updateValues() {
		updateValuesIn(this.global, cfg.global);
		this.updateThisChannel();
		for (const key in cfg.flags) {
			this.flags[key as FlagName].checked = cfg.flags[key as FlagName];
		}
	},
};

/**
 *  @returns if the cfg was updated
 */
const updateCfg = (cfg: ScriptCfg) => {
	const doUpdate = cfg._v !== STORAGE_VERSION;
	if (doUpdate) {
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
	}
	return doUpdate;
};
if (updateCfg(cfg)) saveCfg(cfg);

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
		const item = getItem();
		if (check(item)) return res(item);
		const reqLimit = msToWait / msReqTimeout;
		let i = 0;
		const interval = setInterval(() => {
			const item = getItem();
			if (check(item)) {
				clearInterval(interval);
				res(item);
			} else if (++i > reqLimit) {
				clearInterval(interval);
				rej("Timeout: item wasn't found");
			}
		}, msReqTimeout);
	});

const untilAppear = <T>(getItem: () => T, msToWait?: number) =>
	until<T>(getItem, Boolean, msToWait);

let channelConfig = null as Partial<Cfg>;

type Focusable = { focus(): void };

const menu = {
	element: null as HTMLDivElement,
	btn: null as HTMLButtonElement,
	isOpen: false,
	width: 0,
	_closeListener: {
		onClick(e: Event) {
			const el = e.target as HTMLElement;
			if (!isDescendantOrTheSame(el, [menu.element, menu.btn])) menu.toggle();
		},
		onKeyUp(e: KeyboardEvent) {
			if (e.code === 'Escape') {
				menu._setOpen(false);
				menu.btn.focus();
			}
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
	firstElement: null as Focusable,
	_setOpen(bool: boolean) {
		if (bool) {
			this.fixPosition();
			this.element.style.visibility = 'visible';
			this._closeListener.add();
			this.firstElement.focus();
		} else {
			this.element.style.visibility = 'hidden';
			this._closeListener.remove();
		}
		this.isOpen = bool;
	},
	toggle: debounce(function () {
		this._setOpen(!this.isOpen);
	}, 100),
	fixPosition() {
		const { y, height, width, left } = this.btn.getBoundingClientRect();
		this.element.style.top = y + height + 8 + 'px';
		this.element.style.left = left + width - this.width + 'px';
	},
};

const $ = <T extends HTMLElement>(id: string) =>
	document.getElementById(id) as T;

const getChannelUsername = (aboveTheFold: HTMLElement) =>
	/(?<=@|\/c\/).+?$/.exec(
		aboveTheFold.querySelector<HTMLAnchorElement>('.ytd-channel-name > a').href
	)?.[0];

const getPlr = () => $('movie_player');
const getAboveTheFold = () => $('above-the-fold');
const getActionsBar = () => $('actions')?.querySelector('ytd-menu-renderer');

const untilChannelUsernameAppear = (aboveTheFold: HTMLElement) =>
	untilAppear(() => getChannelUsername(aboveTheFold)).catch(() => '');

const isMusicChannel = (aboveTheFold: HTMLElement) =>
	!!aboveTheFold.querySelector('.badge-style-type-verified-artist');

const findInNodeList = <T extends HTMLElement>(
	list: DeepReadonly<NodeListOf<T>>,
	finder: (item: T) => boolean
) => {
	for (const item of list) {
		if (finder(item)) return item;
	}
	return null;
};

const plr = {
	async set(el: HTMLElement) {
		this.isSpeedApplied = false;
		await delay(1_000);
		const getAd = () => el.querySelector('.ytp-ad-player-overlay');
		await until(getAd, (ad) => !ad, 200_000);
		this.video ||= el.querySelector('.html5-main-video');
		this.subtitlesBtn ||= el.querySelector('.ytp-subtitles-button');
		this.muteBtn ||= el.querySelector('.ytp-mute-button');

		this.menu.element ||= el.querySelector('.ytp-settings-menu');
		this.menu._btn ||= el.querySelector('.ytp-settings-button');
		const clickBtn = () => {
			this.menu._btn.click();
		};

		restoreFocusAfter(clickBtn);
		await delay(50);
		restoreFocusAfter(clickBtn);

		const getMenuItems = () =>
			plr.menu.element.querySelectorAll<YtSettingItem>(
				'.ytp-menuitem[role="menuitem"]'
			);
		plr.menu.setSettingItems(await until(getMenuItems, (arr) => !!arr.length));
		if (!this.speedNormal)
			restoreFocusAfter(() => {
				this.speedNormal = plr.menu.findInItem(
					SPEED,
					(btn) => !+btn.textContent
				).textContent;
			});
	},
	isSpeedApplied: false,
	speedNormal: '',
	element: null as HTMLElement,
	video: null as HTMLVideoElement,
	subtitlesBtn: null as HTMLButtonElement,
	muteBtn: null as HTMLButtonElement,
	menu: {
		element: null as HTMLElement,
		_btn: null as HTMLElement,
		isOpen() {
			return this.element.style.display !== 'none';
		},
		setOpen(bool: boolean) {
			if (bool !== this.isOpen()) this._btn.click();
		},
		openItem(item: Readonly<YtSettingItem>) {
			this.setOpen(true);
			item.click();
			return this.element.querySelectorAll(
				'.ytp-panel-animate-forward .ytp-menuitem-label'
			);
		},
		settingItems: {
			[SPEED]: null,
			[QUALITY]: null,
		} as Record<YtSettingName, YtSettingItem | null>,
		setSettingItems(items: DeepReadonly<NodeListOf<YtSettingItem>>) {
			const findIcon = (d: string) =>
				findInNodeList(items, (el) => !!el.querySelector(`path[d="${d}"]`));

			this.settingItems[SPEED] = findIcon(
				'M10,8v8l6-4L10,8L10,8z M6.3,5L5.7,4.2C7.2,3,9,2.2,11,2l0.1,1C9.3,3.2,7.7,3.9,6.3,5z            M5,6.3L4.2,5.7C3,7.2,2.2,9,2,11 l1,.1C3.2,9.3,3.9,7.7,5,6.3z            M5,17.7c-1.1-1.4-1.8-3.1-2-4.8L2,13c0.2,2,1,3.8,2.2,5.4L5,17.7z            M11.1,21c-1.8-0.2-3.4-0.9-4.8-2 l-0.6,.8C7.2,21,9,21.8,11,22L11.1,21z            M22,12c0-5.2-3.9-9.4-9-10l-0.1,1c4.6,.5,8.1,4.3,8.1,9s-3.5,8.5-8.1,9l0.1,1 C18.2,21.5,22,17.2,22,12z'
			);
			this.settingItems[QUALITY] = findIcon(
				'M15,17h6v1h-6V17z M11,17H3v1h8v2h1v-2v-1v-2h-1V17z M14,8h1V6V5V3h-1v2H3v1h11V8z            M18,5v1h3V5H18z M6,14h1v-2v-1V9H6v2H3v1 h3V14z M10,12h11v-1H10V12z'
			);
		},
		findInItem(
			name: YtSettingName,
			finder: (item: Readonly<HTMLElement>) => boolean
		) {
			return findInNodeList(this.openItem(this.settingItems[name]), finder);
		},
	},
};

type YtSettingName = typeof SPEED | typeof QUALITY;

const validateVolume = (value: string) => {
	const num = +value;
	return num < 0 || num > 100
		? 'out of range'
		: isNaN(num)
			? 'not a number'
			: null;
};

type Props<T extends HTMLElement> = Partial<T> & object;
const getElCreator =
	<TTag extends keyof HTMLElementTagNameMap>(tag: TTag) =>
	<TProps extends DeepReadonly<Props<HTMLElementTagNameMap[TTag]>>>(
		props?: TProps
	) =>
		Object.assign(document.createElement(tag), props);
type Comparator = (target: string, current: string) => boolean;
const comparators: { readonly [P in YtSettingName]: Comparator } = {
	// assuming the search is from the top
	[QUALITY]: (target, current) =>
		+target >= parseInt(current) &&
		(cfg.flags.enhancedBitrate || !current.toLowerCase().includes('premium')),
	[SPEED]: (target, current) => target === current,
};
const logger = {
	// log(...msgs: string[]) {
	// 	console.log('[YT-Defaulter]', ...msgs);
	// },
	err(...msgs: readonly string[]) {
		console.error('[YT-Defaulter]', ...msgs);
	},
	outOfRange(what: string) {
		this.err(what, 'value is out of range');
	},
};
type ValueSetterHelpers = {
	_ytSettingItem(settingName: YtSettingName, value: string): void;
};
type ValueSetters = { [P in Setting]: (value: Cfg[P]) => void };

const valueSetters: ValueSetters & ValueSetterHelpers = {
	_ytSettingItem(settingName, value) {
		const isOpen = plr.menu.isOpen();
		const compare = comparators[settingName];
		const btn = plr.menu.findInItem(settingName, (btn) =>
			compare(value, btn.textContent)
		);
		if (btn) {
			btn.click();
			plr.menu.setOpen(isOpen);
		}
	},
	speed(value) {
		this._ytSettingItem(SPEED, plr.isSpeedApplied ? plr.speedNormal : value);
		plr.isSpeedApplied = !plr.isSpeedApplied;
	},
	customSpeed(value) {
		try {
			plr.video.playbackRate = plr.isSpeedApplied ? 1 : +value;
		} catch {
			logger.outOfRange('Custom speed');
			return;
		}
		plr.isSpeedApplied = !plr.isSpeedApplied;
	},
	subtitles(value) {
		if (plr.subtitlesBtn.ariaPressed !== value.toString())
			plr.subtitlesBtn.click();
	},
	volume(value) {
		const num = +value;
		const isMuted = plr.muteBtn.dataset.titleNoTooltip !== 'Mute';
		if (num === 0) {
			if (!isMuted) plr.muteBtn.click();
		} else {
			if (isMuted) plr.muteBtn.click();
			try {
				plr.video.volume = num / 100;
			} catch {
				logger.outOfRange('Volume');
			}
		}
	},
	quality(value) {
		this._ytSettingItem(QUALITY, value);
	},
};
const div = getElCreator('div'),
	input = getElCreator('input'),
	checkbox = <T extends Props<HTMLInputElement>>(props?: DeepReadonly<T>) =>
		input({ type: 'checkbox', ...props }),
	option = getElCreator('option'),
	_label = getElCreator('label'),
	labelEl = <T extends Props<HTMLLabelElement>>(
		forId: string,
		props?: DeepReadonly<T>
	) => {
		const elem = _label(props);
		elem.setAttribute('for', forId);
		return elem;
	},
	selectEl = getElCreator('select'),
	btnClass = 'yt-spec-button-shape-next',
	btnClassFocused = btnClass + '--focused',
	_button = getElCreator('button'),
	button = <T extends Props<HTMLButtonElement>>(
		textContent: string,
		props?: DeepReadonly<T>
	) =>
		_button({
			textContent,
			className: `${btnClass} ${btnClass}--tonal ${btnClass}--mono ${btnClass}--size-m`,
			onfocus(this: HTMLButtonElement) {
				this.classList.add(btnClassFocused);
			},
			onblur(this: HTMLButtonElement) {
				this.classList.remove(btnClassFocused);
			},
			...props,
		});

class Hint {
	constructor(prefix: string, props?: DeepReadonly<Props<HTMLDivElement>>) {
		this.element = div(props);
		this.element.className ||= SETTING_HINT_CLASS;
		this.prefix = prefix;
		this.hide();
	}
	hide(): void {
		this.element.style.display = 'none';
	}
	show(msg?: string): void {
		this.element.style.display = 'block';
		if (msg) this.element.textContent = this.prefix + msg;
	}
	private prefix: string;
	element: HTMLDivElement;
}

const computeSettings = (doNotChangeSpeed: boolean) => {
	const settings = {
		...cfg.global,
		...channelConfig,
	};
	const isChannelSpeed = 'speed' in channelConfig;
	const isChannelCustomSpeed = 'customSpeed' in channelConfig;
	if (doNotChangeSpeed) {
		settings.speed = plr.speedNormal;
		delete settings.customSpeed;
	} else if (isChannelCustomSpeed) {
		delete settings.speed;
	} else if (isChannelSpeed) {
		delete settings.customSpeed;
	}
	return settings;
};

const applySettings = (settings: Cfg) => {
	restoreFocusAfter(() => {
		if (!isNaN(+settings.customSpeed)) {
			valueSetters.customSpeed(settings.customSpeed);
		}

		delete settings.customSpeed;

		for (const setting in settings)
			valueSetters[setting as Setting](settings[setting as never]);
		plr.menu.setOpen(false);
	});
};

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
const onPageChange = async () => {
	if (location.pathname !== '/watch') return;

	/* ---------------------- apply settings ---------------------- */

	const aboveTheFold = await untilAppear(getAboveTheFold);
	const channelUsername = await untilChannelUsernameAppear(aboveTheFold);

	channelConfig = cfg.channels[channelUsername] ||= {};

	await plr.set(await untilAppear(getPlr));

	applySettings(
		computeSettings(
			cfg.flags.standardMusicSpeed && isMusicChannel(aboveTheFold)
		)
	);

	/* ---------------------- settings menu ---------------------- */

	if (menu.element) {
		menuControls.updateThisChannel();
		return;
	}

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

	const toOptions: ToOptions = (values, getText) => [
		option({
			value: text.DEFAULT,
			textContent: text.DEFAULT,
		}),
		...values.map((value) =>
			option({
				value,
				textContent: getText(value),
			})
		),
	];

	const speedValues = [
		'2',
		'1.75',
		'1.5',
		'1.25',
		plr.speedNormal,
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
		sectionId: typeof SECTION_GLOBAL | typeof SECTION_LOCAL,
		title: string,
		sectionCfg: Cfg
	): HTMLDivElement => {
		const section = div({ role: 'group' });
		section.setAttribute('aria-labelledby', sectionId);
		const getLocalId = (name: string) => PREFIX + name + '-' + sectionId;

		const addItem = <TElem extends Control & { hint?: Hint }>(
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
				name,
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
			// @ts-ignore
			menuControls[sectionId][name] = elem;
			if (elem.hint) section.append(elem.hint.element);
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
				onfocus(this: ReadonlyInputWithHint) {
					this.hint.show();
				},
				onblur(this: ReadonlyInputWithHint) {
					this.hint.hide();
				},
				hint: new Hint('', { textContent: text.CUSTOM_SPEED_HINT }),
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
				oninput(this: ReadonlyInputWithHint) {
					const warning = validateVolume(this.value);
					if (warning) {
						this.hint.show(warning);
					} else {
						this.hint.hide();
					}
				},
				hint: new Hint('Warning: '),
			})
		);
		addItem(SUBTITLES, text.SUBTITLES, checkbox());
		return section;
	};

	const sections = div({ className: PREFIX + 'sections' });
	sections.append(
		createSection(SECTION_GLOBAL, text.GLOBAL, cfg.global),
		createSection(SECTION_LOCAL, text.LOCAL, channelConfig)
	);
	const checkboxDiv = (
		id: string,
		prop: FlagName,
		textContent: string
	): HTMLDivElement => {
		const cont = div({ className: 'check-cont' });
		id = PREFIX + id;
		const elem = checkbox({
			id,
			checked: cfg.flags[prop],
			onclick(this: HTMLInputElement) {
				cfg.flags[prop] = this.checked;
			},
		});
		menuControls.flags[prop] = elem;
		cont.append(labelEl(id, { textContent }), elem);
		return cont;
	};

	const controlStatus = div();
	const updateControlStatus = (content: string) => {
		controlStatus.textContent = `[${new Date().toLocaleTimeString()}] ${content}`;
	};
	const controlDiv = div({ className: 'control-cont' });
	controlDiv.append(
		button(text.SAVE, {
			onclick() {
				saveCfg(cfg);
				updateControlStatus(text.SAVE);
			},
		}),
		button(text.EXPORT, {
			onclick: () => {
				navigator.clipboard.writeText(localStorage[STORAGE_NAME]).then(() => {
					updateControlStatus(text.EXPORT);
				});
			},
		}),
		button(text.IMPORT, {
			onclick: async () => {
				try {
					const raw = await navigator.clipboard.readText();
					const newCfg = JSON.parse(raw);
					if (typeof newCfg !== 'object' || !newCfg._v) {
						throw new Error('Invalid data');
					}
					updateCfg(newCfg);
					localStorage[STORAGE_NAME] = raw;
					cfg = newCfg;
					channelConfig = cfg.channels[channelUsername] ||= {};
				} catch (e) {
					updateControlStatus('Import: ' + e.message);
					return;
				}
				updateControlStatus(text.IMPORT);
				menuControls.updateValues();
			},
		})
	);
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
		checkboxDiv('enhanced-bitrate', 'enhancedBitrate', text.ENHANCED_BITRATE),
		controlDiv,
		controlStatus
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
	if (lastHref !== location.href) {
		lastHref = location.href;
		setTimeout(onPageChange, 1_000);
	}
}, 1_000);

const onClick = (e: Event) => {
	const { shortsToUsual, newTab } = cfg.flags;
	if (!(shortsToUsual || newTab)) return;
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
		if (!e.ctrlKey || e.shiftKey) return;
		if (cfg.flags.copySubs && e.code === 'KeyC') {
			const plr = document.querySelector('.html5-video-player');
			if (!plr?.classList.contains('ytp-fullscreen')) return;
			const text = Array.from(
				plr.querySelectorAll('.captions-text > span'),
				(line) => line.textContent
			).join(' ');
			navigator.clipboard.writeText(text);
		} else if (e.code === 'Space') {
			e.stopPropagation();
			e.preventDefault();
			const customSpeedValue = channelConfig
				? channelConfig.customSpeed ||
					(!channelConfig.speed && cfg.global.customSpeed)
				: cfg.global.customSpeed;
			if (customSpeedValue) return valueSetters.customSpeed(customSpeedValue);
			restoreFocusAfter(() => {
				valueSetters[SPEED]((channelConfig || cfg.global)[SPEED]);
			});
		}
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
.control-cont > button {margin: .2rem}
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
