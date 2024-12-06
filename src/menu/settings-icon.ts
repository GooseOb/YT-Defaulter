import { $ } from '../utils';

export const settingsIcon = () => {
	const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	for (const [prop, value] of [
		['viewBox', '0 0 24 24'],
		['width', '24'],
		['height', '24'],
		['fill', 'var(--yt-spec-text-primary)'],
	] as const) {
		element.setAttribute(prop, value);
	}
	element.append($('settings'));
	return element;
};
