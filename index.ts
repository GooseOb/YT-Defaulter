import { $, restoreFocusAfter, untilAppear } from './utils';
import { withOnClick } from './utils/with';
import { text, translations } from './text';
import { style } from './style';
import { div, button, btnClass, labelEl, checkbox } from './elements-creators';
import { menu, section, settingsIcon } from './menu';
import { plr } from './plr';
import { logger } from './logger';
import * as config from './cfg';
import { menuControls } from './menu-controls';

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

if (config.update(cfg)) config.save(cfg);

let channelConfig = null as Partial<Cfg>;

const getPlr = () => $('movie_player');
const getAboveTheFold = () => $('above-the-fold');
const getActionsBar = () => $('actions')?.querySelector('ytd-menu-renderer');

const getChannelUsername = (aboveTheFold: HTMLElement) =>
	/(?<=@|\/c\/).+?$/.exec(
		aboveTheFold.querySelector<HTMLAnchorElement>('.ytd-channel-name > a')!.href
	)?.[0];

const untilChannelUsernameAppear = (aboveTheFold: HTMLElement) =>
	untilAppear(() => getChannelUsername(aboveTheFold)).catch(() => '');

const isMusicChannel = (aboveTheFold: HTMLElement) =>
	!!aboveTheFold.querySelector('.badge-style-type-verified-artist');

type YtSettingName = typeof SPEED | typeof QUALITY;

type Comparator = (target: string, current: string) => boolean;
const comparators: { readonly [P in YtSettingName]: Comparator } = {
	// assuming the search is from the top
	[QUALITY]: (target, current) =>
		+target >= parseInt(current) &&
		(cfg.flags.enhancedBitrate || !current.toLowerCase().includes('premium')),
	[SPEED]: (target, current) => target === current,
};
type ValueSetterHelpers = {
	_ytSettingItem(settingName: YtSettingName, value: string): void;
};
type ValueSetters = { [P in Setting]: (value: Required<Cfg>[P]) => void };

const valueSetters: ValueSetters & ValueSetterHelpers = {
	_ytSettingItem(settingName, value) {
		const isOpen = plr.menu.isOpen();
		const compare = comparators[settingName];
		const btn = plr.menu.findInItem(settingName, (btn) =>
			compare(value, btn.textContent!)
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

const computeSettings = (doNotChangeSpeed: boolean): Cfg => {
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
		// @ts-expect-error
		if (!isNaN(+settings.customSpeed)) {
			valueSetters.customSpeed(settings.customSpeed!);
		}

		delete settings.customSpeed;

		for (const setting in settings) {
			valueSetters[setting as Setting](settings[setting as never]);
		}
		plr.menu.setOpen(false);
	});
};

const controlCheckboxDiv = (
	id: string,
	flagName: FlagName,
	textContent: string
): HTMLDivElement => {
	const cont = div({ className: 'check-cont' });
	id = PREFIX + id;
	const elem = withOnClick(
		checkbox({
			id,
			checked: cfg.flags[flagName],
		}),
		function (this: HTMLInputElement) {
			cfg.flags[flagName] = this.checked;
		}
	);
	menuControls.flags[flagName] = elem;
	cont.append(labelEl(id, { textContent }), elem);
	return cont;
};

const initMenu = async (updateChannelConfig: () => void) => {
	const sections = div({ className: PREFIX + 'sections' });
	sections.append(
		section(SECTION_GLOBAL, text.GLOBAL, cfg.global),
		section(SECTION_LOCAL, text.LOCAL, channelConfig)
	);

	const controlStatus = div();
	const updateControlStatus = (content: string) => {
		controlStatus.textContent = `[${new Date().toLocaleTimeString()}] ${content}`;
	};
	const controlDiv = div({ className: 'control-cont' });
	controlDiv.append(
		withOnClick(button(text.SAVE), () => {
			config.save(cfg);
			updateControlStatus(text.SAVE);
		}),
		withOnClick(button(text.EXPORT), () => {
			navigator.clipboard.writeText(localStorage[STORAGE_NAME]).then(() => {
				updateControlStatus(text.EXPORT);
			});
		}),
		withOnClick(button(text.IMPORT), async () => {
			try {
				const raw = await navigator.clipboard.readText();
				const newCfg = JSON.parse(raw);
				if (typeof newCfg !== 'object' || !newCfg._v) {
					throw new Error('Invalid data');
				}
				config.update(newCfg);
				localStorage[STORAGE_NAME] = raw;
				cfg = newCfg;
				updateChannelConfig();
			} catch (e) {
				updateControlStatus('Import: ' + e.message);
				return;
			}
			updateControlStatus(text.IMPORT);
			menuControls.updateValues(cfg);
		})
	);

	menu.btn = withOnClick(
		button('', {
			id: BTN_ID,
			ariaLabel: text.OPEN_SETTINGS,
			tabIndex: 0,
		}),
		() => {
			menu.toggle();
		}
	);
	menu.btn.setAttribute('aria-controls', MENU_ID);
	menu.btn.classList.add(btnClass + '--icon-button');
	menu.btn.append(settingsIcon());

	menu.element = div({
		id: MENU_ID,
	});
	menu.element.append(
		sections,
		controlCheckboxDiv('shorts', 'shortsToUsual', text.SHORTS),
		controlCheckboxDiv('new-tab', 'newTab', text.NEW_TAB),
		controlCheckboxDiv('copy-subs', 'copySubs', text.COPY_SUBS),
		controlCheckboxDiv(
			'standard-music-speed',
			'standardMusicSpeed',
			text.STANDARD_MUSIC_SPEED
		),
		controlCheckboxDiv(
			'enhanced-bitrate',
			'enhancedBitrate',
			text.ENHANCED_BITRATE
		),
		controlDiv,
		controlStatus
	);
	menu.element.addEventListener('keyup', (e) => {
		const el = e.target as HTMLInputElement;
		if (e.code === 'Enter' && el.type === 'checkbox') el.checked = !el.checked;
	});

	const actionsBar = (await untilAppear(getActionsBar))!;
	actionsBar.insertBefore(menu.btn, actionsBar.lastChild);
	document.querySelector('ytd-popup-container')!.append(menu.element);
	menu.width = menu.element.getBoundingClientRect().width;
	sections.style.maxWidth = sections.offsetWidth + 'px';
};

const onPageChange = async () => {
	if (location.pathname !== '/watch') return;

	const aboveTheFold = await untilAppear(getAboveTheFold);
	const channelUsername = await untilChannelUsernameAppear(aboveTheFold);

	const updateChannelConfig = () => {
		channelConfig = cfg.channels[channelUsername!] ||= {};
	};

	updateChannelConfig();

	await plr.set(await untilAppear(getPlr));

	applySettings(
		computeSettings(
			cfg.flags.standardMusicSpeed && isMusicChannel(aboveTheFold)
		)
	);

	if (menu.element) {
		menuControls.updateThisChannel(channelConfig);
	} else {
		await initMenu(updateChannelConfig);
	}
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
		el = el.closest('a')!;
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

document.head.append(style);
