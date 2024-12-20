import { debounce, isDescendantOrTheSame } from '../utils';

type Focusable = { focus(): void };

export const value = {
	element: null as HTMLDivElement,
	btn: null as HTMLButtonElement,
	isOpen: false,
	width: 0,
	_closeListener: {
		onClick(e: Event) {
			const el = e.target as HTMLElement;
			if (!isDescendantOrTheSame(el, [value.element, value.btn]))
				value.toggle();
		},
		onKeyUp(e: KeyboardEvent) {
			if (e.code === 'Escape') {
				value._setOpen(false);
				value.btn.focus();
			}
		},
		add() {
			document.addEventListener('click', this.onClick);
			document.addEventListener('keyup', this.onKeyUp);
		},
		remove() {
			document.removeEventListener('click', this.onClick);
			document.removeEventListener('keyup', this.onKeyUp);
		},
	},
	firstFocusable: null as Focusable,
	_setOpen(bool: boolean) {
		if (bool) {
			this.fixPosition();
			this.element.style.visibility = 'visible';
			this._closeListener.add();
			this.firstFocusable.focus();
		} else {
			this.element.style.visibility = 'hidden';
			this._closeListener.remove();
		}
		this.isOpen = bool;
	},
	toggle: debounce(function () {
		this._setOpen(!this.isOpen);
	}, 100),
	fixPosition() {
		const { y, height, width, left } = this.btn.getBoundingClientRect();
		this.element.style.top = y + height + 8 + 'px';
		this.element.style.left = left + width - this.width + 'px';
	},
};
