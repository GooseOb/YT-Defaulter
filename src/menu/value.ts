import { debounce } from '../utils';
import { ref } from '../utils/ref';
import { close, listenForClose } from './close';

export const set = (el: HTMLDivElement, btnEl: HTMLButtonElement) => {
	element = el;
	btn = btnEl;
};

export let element = null as HTMLDivElement;
export let btn = null as HTMLButtonElement;
export let isOpen = false;

let menuWidth = 0;
export const adjustWidth = () => {
	menuWidth = element.getBoundingClientRect().width;
};

type Focusable = { focus(): void };
export const firstFocusable = ref<Focusable>(null);

export const toggle = debounce(() => {
	isOpen = !isOpen;
	if (isOpen) {
		fixPosition();
		element.style.visibility = 'visible';
		listenForClose();
		firstFocusable.val.focus();
	} else {
		close();
	}
}, 100);

export const fixPosition = () => {
	const { y, height, width, left } = btn.getBoundingClientRect();
	element.style.top = y + height + 8 + 'px';
	element.style.left = left + width - menuWidth + 'px';
};
