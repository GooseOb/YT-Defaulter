import * as config from './config';
import { text, translations } from './text';
import { style } from './style';
import { onClick, onKeyup, onVideoPage } from './listeners';
import { findInNodeList } from './utils';

Object.assign(text, translations[document.documentElement.lang]);

if (config.update(config.value)) {
	config.saveLS(config.value);
}

declare global {
	interface WindowEventMap {
		'yt-navigate-finish': CustomEvent<{ pageType: string }>;
	}
}

window.addEventListener('yt-navigate-finish', ({ detail: { pageType } }) => {
	if (pageType === 'watch' || pageType === 'live') {
		setTimeout(onVideoPage, 1_000);
	}
});

setInterval(() => {
	if (config.value.flags.hideShorts)
		findInNodeList(
			document.querySelectorAll('#title'),
			(el) => el.textContent === 'Shorts'
		)
			?.closest('ytd-rich-section-renderer')
			?.remove();
}, 1_000);

document.addEventListener('click', onClick, { capture: true });
document.addEventListener('keyup', onKeyup, { capture: true });

document.head.append(style);
