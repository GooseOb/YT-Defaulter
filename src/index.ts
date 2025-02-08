import * as config from './config';
import { text, translations } from './text';
import { style } from './style';
import { onClick, onKeyup } from './listeners';
import { onPageChange } from './listeners/page-change';
import { findInNodeList } from './utils';

Object.assign(text, translations[document.documentElement.lang]);

if (config.update(config.value)) {
	config.saveLS(config.value);
}

const updatePage = () => {
	onPageChange(location.href);
};

if (window.onurlchange === null) {
	window.addEventListener('urlchange', ({ url }) => {
		onPageChange(url);
	});
}

setInterval(() => {
	if (window.onurlchange !== null) updatePage();

	if (config.value.flags.hideShorts)
		findInNodeList(
			document.querySelectorAll('#title'),
			(el) => el.textContent === 'Shorts'
		)
			?.closest('ytd-rich-section-renderer')
			.remove();
}, 1_000);

updatePage();

document.addEventListener('click', onClick, { capture: true });
document.addEventListener('keyup', onKeyup, { capture: true });

document.head.append(style);
