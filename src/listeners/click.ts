import { value } from '../config';

export const onClick = (e: Event) => {
	const { shortsToRegular, newTab } = value.flags;
	if (shortsToRegular || newTab) {
		let el = e.target as HTMLAnchorElement;
		if (el.tagName !== 'A') {
			el = el.closest('a');
		}
		if (el) {
			const isShorts = el.href.includes('/shorts/');
			if (shortsToRegular && isShorts) {
				el.href = el.href.replace('shorts/', 'watch?v=');
			}
			const isNormal = el.href.includes('/watch?v=');
			if (newTab && (isShorts || isNormal)) {
				el.target = '_blank';
				e.stopPropagation();
			}
		}
	}
};
