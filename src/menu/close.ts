import { isDescendantOrTheSame } from '../utils';
import { element, btn } from './value';

export const close = () => {
	element.style.visibility = 'hidden';
	stopListening();
};

export const listenForClose = () => {
	document.addEventListener('click', onClick);
	document.addEventListener('keyup', onKeyUp);
};

const stopListening = () => {
	document.removeEventListener('click', onClick);
	document.removeEventListener('keyup', onKeyUp);
};

const onClick = (e: Event) => {
	const el = e.target as HTMLElement;
	if (!isDescendantOrTheSame(el, [element, btn])) close();
};

const onKeyUp = (e: KeyboardEvent) => {
	if (e.code === 'Escape') {
		close();
		btn.focus();
	}
};
