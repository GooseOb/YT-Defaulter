import { restoreFocusAfter } from '../utils';
import { plr } from './plr';
import { valueSetters } from './value-setters';

export const applySettings = (settings: Cfg) => {
	restoreFocusAfter(() => {
		if (!isNaN(+settings.customSpeed)) {
			valueSetters.customSpeed(settings.customSpeed);
		}

		delete settings.customSpeed;

		for (const setting in settings) {
			valueSetters[setting as Setting](settings[setting as never]);
		}
		plr.menu.setOpen(false);
	});
};
