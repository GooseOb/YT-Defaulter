import { text } from '../text';
import {
	btnClass,
	button,
	checkbox,
	div,
	labelEl,
} from '../utils/element-creators';
import * as controls from './controls';
import { section } from './section';
import { settingsIcon } from './settings-icon';
import * as config from '../config';
import { withOnClick } from '../utils/with';
import * as menu from './value';
import { untilAppear } from '../utils';
import * as get from '../element-getters';

export const init = () => {
	const sections = div({ className: PREFIX + 'sections' });
	sections.append(
		section(SECTION_GLOBAL, text.GLOBAL, config.value.global),
		section(SECTION_LOCAL, text.LOCAL, config.channel())
	);

	const controlStatus = div();
	const updateControlStatus = (content: string) => {
		controlStatus.textContent = `[${new Date().toLocaleTimeString()}] ${content}`;
	};
	const controlDiv = div({ className: 'control-cont' });
	controlDiv.append(
		withOnClick(button(text.SAVE), () => {
			config.prune();
			config.saveLS(config.value);
			updateControlStatus(text.SAVE);
		}),
		withOnClick(button(text.EXPORT), () => {
			navigator.clipboard.writeText(localStorage[STORAGE_NAME]).then(() => {
				updateControlStatus(text.EXPORT);
			});
		}),
		withOnClick(button(text.IMPORT), () => {
			navigator.clipboard
				.readText()
				.then((raw) => {
					config.save(raw);
					controls.updateValues(config.value);
					return text.IMPORT;
				})
				.catch((e) => text.IMPORT + ': ' + e.message)
				.then(updateControlStatus);
		})
	);

	menu.set(
		div({
			id: MENU_ID,
		}),
		withOnClick(
			button('', {
				id: BTN_ID,
				ariaLabel: text.OPEN_SETTINGS,
				tabIndex: 0,
			}),
			menu.toggle
		)
	);

	menu.btn.setAttribute('aria-controls', MENU_ID);
	menu.btn.classList.add(btnClass + '--icon-button');
	menu.btn.append(settingsIcon());

	menu.element.append(
		sections,
		...Object.entries(controls.flags).map(
			([flagName, flag]: [controls.FlagName, controls.Flag]) => {
				const cont = div({ className: 'check-cont' });
				const id = PREFIX + flag.id;
				const elem = withOnClick(
					checkbox({
						id,
						checked: config.value.flags[flagName],
					}),
					function (this: HTMLInputElement) {
						config.value.flags[flagName] = this.checked;
					}
				);
				flag.elem = elem;
				cont.append(labelEl(id, { textContent: flag.text }), elem);
				return cont;
			}
		),
		controlDiv,
		controlStatus
	);
	menu.element.addEventListener('keyup', (e) => {
		const el = e.target as HTMLInputElement;
		if (e.code === 'Enter' && el.type === 'checkbox') el.checked = !el.checked;
	});

	untilAppear(get.actionsBar).then((actionsBar) => {
		actionsBar.insertBefore(menu.btn, actionsBar.lastChild);
		get.popupContainer().append(menu.element);
		menu.adjustWidth();
		sections.style.maxWidth = sections.offsetWidth + 'px';
	});

	const listener = () => {
		if (menu.isOpen) menu.fixPosition();
	};
	window.addEventListener('scroll', listener);
	window.addEventListener('resize', listener);
};
