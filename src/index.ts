import { restoreFocusAfter, untilAppear } from './utils';
import { text, translations } from './text';
import { style } from './style';
import { applySettings, plr, valueSetters } from './player';
import { computeSettings } from './compute-settings';
import * as menu from './menu';
import * as config from './config';
import * as get from './element-getters';

Object.assign(text, translations[document.documentElement.lang]);

if (config.update(config.value)) config.saveLS(config.value);

const isMusicChannel = (aboveTheFold: HTMLElement) =>
	!!get.artistChannelBadge(aboveTheFold);

const onPageChange = async () => {
	if (location.pathname !== '/watch') return;

	const aboveTheFold = await untilAppear(get.aboveTheFold);
	config.channel.username =
		(await untilAppear(get.channelUsernameElementGetter(aboveTheFold))).href ||
		'';

	await plr.set(await untilAppear(get.plr));

	applySettings(
		computeSettings(
			config.value.flags.standardMusicSpeed && isMusicChannel(aboveTheFold)
		)
	);

	if (menu.value.element) {
		menu.controls.updateThisChannel(config.channel.get());
	} else {
		await menu.init();
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
			const plr = get.videoPlr();
			if (!plr?.classList.contains('ytp-fullscreen')) return;
			const text = Array.from(
				get.videoPlrCaptions(plr),
				(line) => line.textContent
			).join(' ');
			navigator.clipboard.writeText(text);
		} else if (e.code === 'Space') {
			e.stopPropagation();
			e.preventDefault();
			const channelCfg = config.channel.get();
			const customSpeedValue = channelCfg
				? channelCfg.customSpeed ||
					(!channelCfg.speed && config.value.global.customSpeed)
				: config.value.global.customSpeed;
			if (customSpeedValue) return valueSetters.customSpeed(customSpeedValue);
			restoreFocusAfter(() => {
				valueSetters[SPEED]((channelCfg || config.value.global)[SPEED]);
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
