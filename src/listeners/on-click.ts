import { value } from '../config';

export const onClick = (e: Event) => {
	const { shortsToUsual, newTab } = value.flags;
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
