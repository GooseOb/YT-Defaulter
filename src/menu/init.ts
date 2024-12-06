import { text } from '../text';
import {
	btnClass,
	button,
	checkbox,
	div,
	labelEl,
} from '../utils/element-creators';
import { controls } from './controls';
import { section } from './section';
import { settingsIcon } from './settings-icon';
import * as config from '../config';
import { withOnClick } from '../utils/with';
import { value } from './value';
import { untilAppear } from '../utils';

const controlCheckboxDiv = (
	id: string,
	flagName: FlagName,
	textContent: string
): HTMLDivElement => {
	const cont = div({ className: 'check-cont' });
	id = PREFIX + id;
	const elem = withOnClick(
		checkbox({
			id,
			checked: config.value.flags[flagName],
		}),
		function (this: HTMLInputElement) {
			config.value.flags[flagName] = this.checked;
		}
	);
	controls.flags[flagName] = elem;
	cont.append(labelEl(id, { textContent }), elem);
	return cont;
};

export const init = async (
	updateChannelConfig: () => void,
	getActionsBar: () => Element
) => {
	const sections = div({ className: PREFIX + 'sections' });
	sections.append(
		section(SECTION_GLOBAL, text.GLOBAL, config.value.global),
		section(SECTION_LOCAL, text.LOCAL, config.channel.value)
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
		withOnClick(button(text.IMPORT), async () => {
			try {
				config.save(await navigator.clipboard.readText());
				updateChannelConfig();
			} catch (e) {
				updateControlStatus('Import: ' + e.message);
				return;
			}
			updateControlStatus(text.IMPORT);
			controls.updateValues(config.value);
		})
	);

	value.btn = withOnClick(
		button('', {
			id: BTN_ID,
			ariaLabel: text.OPEN_SETTINGS,
			tabIndex: 0,
		}),
		() => {
			value.toggle();
		}
	);
	value.btn.setAttribute('aria-controls', MENU_ID);
	value.btn.classList.add(btnClass + '--icon-button');
	value.btn.append(settingsIcon());

	value.element = div({
		id: MENU_ID,
	});
	value.element.append(
		sections,
		controlCheckboxDiv('shorts', 'shortsToUsual', text.SHORTS),
		controlCheckboxDiv('new-tab', 'newTab', text.NEW_TAB),
		controlCheckboxDiv('copy-subs', 'copySubs', text.COPY_SUBS),
		controlCheckboxDiv(
			'standard-music-speed',
			'standardMusicSpeed',
			text.STANDARD_MUSIC_SPEED
		),
		controlCheckboxDiv(
			'enhanced-bitrate',
			'enhancedBitrate',
			text.ENHANCED_BITRATE
		),
		controlDiv,
		controlStatus
	);
	value.element.addEventListener('keyup', (e) => {
		const el = e.target as HTMLInputElement;
		if (e.code === 'Enter' && el.type === 'checkbox') el.checked = !el.checked;
	});

	const actionsBar = await untilAppear(getActionsBar);
	actionsBar.insertBefore(value.btn, actionsBar.lastChild);
	document.querySelector('ytd-popup-container').append(value.element);
	value.width = value.element.getBoundingClientRect().width;
	sections.style.maxWidth = sections.offsetWidth + 'px';
};
