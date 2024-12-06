import { $, restoreFocusAfter, untilAppear } from './utils';
import { text, translations } from './text';
import { style } from './style';
import { applySettings, plr, valueSetters } from './player';
import * as menu from './menu';
import * as config from './config';

Object.assign(text, translations[document.documentElement.lang]);

if (config.update(config.value)) config.saveLS(config.value);

const getPlr = () => $('movie_player');
const getAboveTheFold = () => $('above-the-fold');
const getActionsBar = () => $('actions')?.querySelector('ytd-menu-renderer');

const getChannelUsername = (aboveTheFold: HTMLElement) =>
	/(?<=@|\/c\/).+?$/.exec(
		aboveTheFold.querySelector<HTMLAnchorElement>('.ytd-channel-name > a').href
	)?.[0];

const untilChannelUsernameAppear = (aboveTheFold: HTMLElement) =>
	untilAppear(() => getChannelUsername(aboveTheFold)).catch(() => '');

const isMusicChannel = (aboveTheFold: HTMLElement) =>
	!!aboveTheFold.querySelector('.badge-style-type-verified-artist');

const computeSettings = (doNotChangeSpeed: boolean): Cfg => {
	const settings = {
		...config.value.global,
		...config.channel.value,
	};
	const isChannelSpeed = 'speed' in config.channel.value;
	const isChannelCustomSpeed = 'customSpeed' in config.channel.value;
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

const onPageChange = async () => {
	if (location.pathname !== '/watch') return;

	const aboveTheFold = await untilAppear(getAboveTheFold);
	const channelUsername = await untilChannelUsernameAppear(aboveTheFold);

	const updateChannelConfig = () => {
		config.channel.set(channelUsername);
	};

	updateChannelConfig();

	await plr.set(await untilAppear(getPlr));

	applySettings(
		computeSettings(
			config.value.flags.standardMusicSpeed && isMusicChannel(aboveTheFold)
		)
	);

	if (menu.value.element) {
		menu.controls.updateThisChannel(config.channel.value);
	} else {
		await menu.init(updateChannelConfig, getActionsBar);
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
	const { shortsToUsual, newTab } = config.value.flags;
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
		if (config.value.flags.copySubs && e.code === 'KeyC') {
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
			const customSpeedValue = config.channel.value
				? config.channel.value.customSpeed ||
					(!config.channel.value.speed && config.value.global.customSpeed)
				: config.value.global.customSpeed;
			if (customSpeedValue) return valueSetters.customSpeed(customSpeedValue);
			restoreFocusAfter(() => {
				valueSetters[SPEED](
					(config.channel.value || config.value.global)[SPEED]
				);
			});
		}
	},
	{ capture: true }
);
const listener = () => {
	if (menu.value.isOpen) menu.value.fixPosition();
};
window.addEventListener('scroll', listener);
window.addEventListener('resize', listener);

document.head.append(style);
