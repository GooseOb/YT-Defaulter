import { computeSettings } from '../compute-settings';
import * as config from '../config';
import * as get from '../element-getters';
import { valueSetters } from '../player';
import { restoreFocusAfter } from '../utils';
import { onClick } from './click';

export const onKeyup = (e: KeyboardEvent) => {
	if (e.code === 'Enter') {
		onClick(e);
	} else if (e.ctrlKey && !e.shiftKey) {
		if (config.value.flags.copySubs && e.code === 'KeyC') {
			const plr = get.videoPlr();
			if (plr?.classList.contains('ytp-fullscreen')) {
				const text = Array.from(
					get.videoPlrCaptions(plr),
					(line) => line.textContent
				).join(' ');
				navigator.clipboard.writeText(text);
			}
		} else if (e.code === 'Space') {
			e.stopPropagation();
			e.preventDefault();
			const settings = computeSettings(false);
			if (settings.speed) {
				restoreFocusAfter(() => {
					valueSetters.speed(settings.speed);
				});
			} else if (settings.customSpeed) {
				valueSetters.customSpeed(settings.customSpeed);
			}
		}
	}
};
