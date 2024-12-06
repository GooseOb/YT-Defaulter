export const withHint = <
	THint extends Hint,
	TItem extends ControlItem<HTMLElement>,
>(
	hint: THint,
	getItem: (hint: THint) => TItem
) => [hint.element, getItem(hint).item];

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
	<TElem extends HTMLElement>(withFn: (elem: TElem, ...args: any[]) => TElem) =>
	(obj: ControlItem<TElem>, ...args: any[]) => {
		withFn(obj.elem, ...args);
		return obj;
	};

export const withControlListeners = controlWith(withListeners);
