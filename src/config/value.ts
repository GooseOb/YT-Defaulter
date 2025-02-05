import type { ScriptCfg } from './types';

const cfgLocalStorage = localStorage[STORAGE_NAME];

export const value: ScriptCfg = cfgLocalStorage
	? JSON.parse(cfgLocalStorage)
	: {
			_v: STORAGE_VERSION,
			global: {},
			channels: {},
			flags: {
				shortsToRegular: false,
				newTab: false,
				copySubs: false,
				standardMusicSpeed: false,
				enhancedBitrate: false,
			},
		};
