import type { Hint } from '../hint';

export const withHint = <
	THint extends Hint,
	TItem extends ControlItem<HTMLElement>,
>(
	hint: THint,
	getItem: (hint: THint) => TItem
) => [getItem(hint).item, hint.element];

export const withOnClick = <TElem extends HTMLElement>(
	elem: TElem,
	listener: (this: TElem, ev: MouseEvent) => void
): TElem => {
	elem.addEventListener('click', listener);
	return elem;
};

export const withListeners = <TElem extends HTMLElement>(
	elem: TElem,
	listeners: {
		[P in keyof HTMLElementEventMap]?: (
			this: TElem,
			ev: HTMLElementEventMap[P]
		) => void;
	}
) => {
	for (const key in listeners) {
		elem.addEventListener(key, listeners[key as keyof HTMLElementEventMap]);
	}
	return elem;
};

const controlWith =
	<TElem extends HTMLElement, TArgs extends any[]>(
		withFn: (elem: TElem, ...args: TArgs) => TElem
	) =>
	(obj: ControlItem<TElem>, ...args: TArgs) => {
		withFn(obj.elem, ...args);
		return obj;
	};

export const withControlListeners = controlWith(withListeners);
