import { checkbox, div, labelEl } from '../utils/element-creators';
import { text } from '../text';
import { withControlListeners, withHint } from '../utils/with';
import { getControlCreators } from './get-controls-creators';
import { validateVolume } from './validate-volume';
import { Hint } from '../hint';
import { setFirstFocusable } from './value';
import { getElCreator } from '../utils';
import { speedNormal } from '../player';
import * as controls from './controls';
import type { Cfg } from '../config';

export const section = (
	sectionId: typeof SECTION_GLOBAL | typeof SECTION_LOCAL,
	title: string,
	sectionCfg: Cfg
): HTMLDivElement => {
	const control = getControlCreators(
		(createElement, initVal) => (name, label, props) => {
			const item = div();
			const id = PREFIX + name + '-' + sectionId;

			const elem = Object.assign(createElement(props), props, {
				id,
				name,
			});
			elem.addEventListener('change', () => {
				const value = val.get();
				if (value === val.default) {
					delete sectionCfg[name];
				} else {
					// @ts-ignore
					sectionCfg[name] = value;
				}
			});

			const val = initVal(elem);
			const cfgValue = sectionCfg[name];
			if (cfgValue) {
				setTimeout(() => {
					val.set(cfgValue.toString());
				});
			}
			item.append(labelEl(id, { textContent: label }), elem);
			// @ts-ignore
			controls.sections[sectionId][name] = elem;
			return { item, elem };
		}
	);

	const speedSelect = control.select(SPEED, text.SPEED, {
		values: ['2', '1.75', '1.5', '1.25', speedNormal, '0.75', '0.5', '0.25'],
		getText: (val) => val,
	});
	if (sectionId === SECTION_GLOBAL) setFirstFocusable(speedSelect.elem);

	const sectionElement = div({ role: 'group' });
	sectionElement.setAttribute('aria-labelledby', sectionId);

	sectionElement.append(
		getElCreator('span')({ textContent: title, id: sectionId }),
		speedSelect.item,
		...withHint(new Hint(''), (hint) =>
			withControlListeners(
				control.numericInput(CUSTOM_SPEED, text.CUSTOM_SPEED),
				{
					blur: () => {
						hint.hide();
					},
					focus: () => {
						hint.show(text.CUSTOM_SPEED_HINT);
					},
				}
			)
		),
		control.select(QUALITY, text.QUALITY, {
			values: [
				'144',
				'240',
				'360',
				'480',
				'720',
				'1080',
				'1440',
				'2160',
				'4320',
			],
			getText: (val) => val + 'p',
		}).item,
		...withHint(new Hint('Warning: '), (hint) =>
			withControlListeners(
				control.numericInput(VOLUME, text.VOLUME, {
					min: '0',
					max: '100',
				}),
				{
					blur() {
						const warning = validateVolume(this.value);
						if (warning) {
							hint.show(warning);
						} else {
							hint.hide();
						}
					},
				}
			)
		),
		control.checkbox(SUBTITLES, text.SUBTITLES, checkbox()).item
	);
	return sectionElement;
};
