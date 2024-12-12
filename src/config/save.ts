import type { ScriptCfg } from './types';
import { update } from './update';
import { value } from './value';

export const saveLS = (newCfg: DeepReadonly<ScriptCfg>) => {
	saveLSRaw(JSON.stringify(newCfg));
};

export const saveLSRaw = (raw: string) => {
	localStorage[STORAGE_NAME] = raw;
};

export const save = (raw: string) => {
	const newCfg = JSON.parse(raw);
	if (typeof newCfg !== 'object' || !newCfg._v) {
		throw new Error('Invalid data');
	}
	if (update(newCfg)) {
		saveLS(newCfg);
	} else {
		saveLSRaw(raw);
	}
	Object.assign(value, newCfg);
};
