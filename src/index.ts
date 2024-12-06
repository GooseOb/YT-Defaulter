import * as config from './config';
import { text, translations } from './text';
import { style } from './style';
import { onClick, onKeyup, onVideoPage } from './listeners';

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
document.addEventListener('keyup', onKeyup, { capture: true });

document.head.append(style);
