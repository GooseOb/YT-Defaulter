import { getElCreator } from './get-el-creator';
import { withListeners } from './with';

export const div = getElCreator('div');
export const input = getElCreator('input');
export const checkbox = <T extends Props<HTMLInputElement>>(
	props?: DeepReadonly<T>
) => input({ type: 'checkbox', ...props });
export const option = getElCreator('option');
const _label = getElCreator('label');
export const labelEl = <T extends Props<HTMLLabelElement>>(
	forId: string,
	props?: DeepReadonly<T>
) => {
	const elem = _label(props);
	elem.setAttribute('for', forId);
	return elem;
};
export const selectEl = getElCreator('select');
export const btnClass = 'yt-spec-button-shape-next';
const btnClassFocused = btnClass + '--focused';
const _button = getElCreator('button');
export const button = <T extends Props<HTMLButtonElement>>(
	textContent: string,
	props?: DeepReadonly<T>
) =>
	withListeners(
		_button({
			textContent,
			className: `${btnClass} ${btnClass}--tonal ${btnClass}--mono ${btnClass}--size-m`,
			...props,
		}),
		{
			focus() {
				this.classList.add(btnClassFocused);
			},
			blur() {
				this.classList.remove(btnClassFocused);
			},
		}
	);
