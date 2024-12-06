/**
 *  @returns if the cfg was updated
 */
export const update = (cfg: ScriptCfg) => {
	const doUpdate = cfg._v !== STORAGE_VERSION;
	if (doUpdate) {
		switch (cfg._v) {
			case 2:
				cfg.flags.standardMusicSpeed = false;
				cfg._v = 3;
			// fall through
			case 3:
				cfg.global.quality = (cfg.global as any).qualityMax;
				delete (cfg.global as any).qualityMax;
				for (const key in cfg.channels) {
					const currCfg = cfg.channels[key];
					currCfg.quality = (currCfg as any).qualityMax;
					delete (currCfg as any).qualityMax;
				}
				cfg._v = STORAGE_VERSION;
		}
	}
	return doUpdate;
};
