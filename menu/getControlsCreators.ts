import { checkbox, input, option, selectEl } from '../elements-creators';
import { text } from '../text';

type GetControlCreator = <
	TSetting extends Setting,
	TElem extends SettingControls[TSetting],
	TProps,
>(
	createElement: (props: TProps) => TElem,
	initVal: (el: TElem) => {
		get: () => string;
		set: (value: string) => void;
		default: string;
	}
) => (name: TSetting, label: string, props: TProps) => ControlItem<TElem>;

export const getControlCreators = (getCreator: GetControlCreator) => ({
	numericInput: getCreator(
		(props?: Props<HTMLInputElement>) =>
			input(Object.assign({ type: 'number' }, props)),
		(elem) => ({
			get: () => elem.value,
			set: (value) => {
				elem.value = value;
			},
			default: '',
		})
	),
	checkbox: getCreator(checkbox, (elem: HTMLInputElement) => ({
		get: () => elem.checked.toString(),
		set: (value) => {
			elem.checked = value === 'true';
		},
		default: text.DEFAULT,
	})),
	select: getCreator(
		({
			values,
			getText,
		}: {
			values: readonly string[];
			getText: (arg: string) => string;
		}) => {
			const elem = selectEl({ value: text.DEFAULT });
			elem.append(
				option({
					value: text.DEFAULT,
					textContent: text.DEFAULT,
				}),
				...values.map((value) =>
					option({
						value,
						textContent: getText(value),
					})
				)
			);
			return elem;
		},
		(elem: HTMLSelectElement) => ({
			get: () => elem.value,
			set: (value) => {
				elem.value = value;
			},
			default: 'false',
		})
	),
});
