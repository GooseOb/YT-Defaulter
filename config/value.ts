const cfgLocalStorage = localStorage[STORAGE_NAME];

export const value: ScriptCfg = cfgLocalStorage
	? JSON.parse(cfgLocalStorage)
	: {
			_v: STORAGE_VERSION,
			global: {},
			channels: {},
			flags: {
				shortsToUsual: false,
				newTab: false,
				copySubs: false,
				standardMusicSpeed: false,
				enhancedBitrate: false,
			},
		};
