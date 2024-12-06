import { restoreFocusAfter } from './utils';
import { text, translations } from './text';
import { style } from './style';
import { valueSetters } from './player';
import { computeSettings } from './compute-settings';
import * as config from './config';
import * as get from './element-getters';
import { onVideoPage } from './on-video-page';
import { onClick } from './on-click';

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
