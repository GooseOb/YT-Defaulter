import type { Cfg, Setting } from '../config';
import { restoreFocusAfter } from '../utils';
import { setOpen } from './menu';
import { valueSetters } from './value-setters';

export const applySettings = (settings: Cfg) => {
	if (!Number.isNaN(+settings.customSpeed)) {
		valueSetters.customSpeed(settings.customSpeed);
	}

	delete settings.customSpeed;

	restoreFocusAfter(() => {
		for (const setting in settings) {
			valueSetters[setting as Setting](settings[setting as never]);
		}
		setOpen(false);
	});
};
