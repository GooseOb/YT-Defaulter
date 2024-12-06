import { value } from './value';

export const prune = () => {
	outer: for (const key in value.channels) {
		const channelCfg = value.channels[key];
		if (channelCfg.subtitles) continue;
		for (const cfgKey in channelCfg) {
			if (cfgKey !== 'subtitles') continue outer;
		}
		delete value.channels[key];
	}
};
