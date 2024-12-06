import { restoreFocusAfter } from './utils';
import { text, translations } from './text';
import { style } from './style';
import { valueSetters } from './player';
import { computeSettings } from './compute-settings';
import * as config from './config';
import * as get from './element-getters';
import { onVideoPage } from './on-video-page';

Object.assign(text, translations[document.documentElement.lang]);

if (config.update(config.value)) {
	config.saveLS(config.value);
}

let lastHref: string;
setInterval(() => {
	if (lastHref !== location.href) {
		lastHref = location.href;
		if (location.pathname === '/watch') {
			setTimeout(onVideoPage, 1_000);
		}
	}
}, 1_000);

const onClick = (e: Event) => {
	const { shortsToUsual, newTab } = config.value.flags;
	if (shortsToUsual || newTab) {
		let el = e.target as HTMLAnchorElement;
		if (el.tagName !== 'A') {
			el = el.closest('a');
		}
		if (el) {
			const isShorts = el.href.includes('/shorts/');
			if (shortsToUsual && isShorts) {
				el.href = el.href.replace('shorts/', 'watch?v=');
			}
			const isUsual = el.href.includes('/watch?v=');
			if (newTab && (isShorts || isUsual)) {
				el.target = '_blank';
				e.stopPropagation();
			}
		}
	}
};

document.addEventListener('click', onClick, { capture: true });
document.addEventListener(
	'keyup',
	(e) => {
		if (e.code === 'Enter') {
			onClick(e);
		} else if (e.ctrlKey && !e.shiftKey) {
			if (config.value.flags.copySubs && e.code === 'KeyC') {
				const plr = get.videoPlr();
				if (plr?.classList.contains('ytp-fullscreen')) {
					const text = Array.from(
						get.videoPlrCaptions(plr),
						(line) => line.textContent
					).join(' ');
					navigator.clipboard.writeText(text);
				}
			} else if (e.code === 'Space') {
				e.stopPropagation();
				e.preventDefault();
				const settings = computeSettings(false);
				if (settings.speed) {
					restoreFocusAfter(() => {
						valueSetters.speed(settings.speed);
					});
				} else if (settings.customSpeed) {
					valueSetters.customSpeed(settings.customSpeed);
				}
			}
		}
	},
	{ capture: true }
);

document.head.append(style);
