import { text } from '../text';
import type { SettingControls } from './types';
import type { Cfg, FlagName, ScriptCfg } from '../config';
import * as config from '../config';

const updateValuesIn = (controls: SettingControls, cfgPart: Readonly<Cfg>) => {
	controls[SPEED].value = cfgPart[SPEED] || text.DEFAULT;
	controls[CUSTOM_SPEED].value = cfgPart[CUSTOM_SPEED] || '';
	controls[QUALITY].value = cfgPart[QUALITY] || text.DEFAULT;
	controls[VOLUME].value = cfgPart[VOLUME] || '';
	(controls[SUBTITLES] as HTMLInputElement).checked =
		cfgPart[SUBTITLES] || false;
};

const channelControls = () =>
	({
		[SPEED]: null as HTMLSelectElement,
		[CUSTOM_SPEED]: null as HTMLInputElement,
		[QUALITY]: null as HTMLSelectElement,
		[VOLUME]: null as HTMLInputElement,
		[SUBTITLES]: null as HTMLInputElement,
	}) satisfies SettingControls;

export const sections = {
	global: channelControls(),
	thisChannel: channelControls(),
};

export const flags = {
	shortsToUsual: null as HTMLInputElement,
	newTab: null as HTMLInputElement,
	copySubs: null as HTMLInputElement,
	standardMusicSpeed: null as HTMLInputElement,
	enhancedBitrate: null as HTMLInputElement,
} satisfies Record<FlagName, HTMLInputElement>;

export const updateThisChannel = () => {
	updateValuesIn(sections.thisChannel, config.channel());
};

export const updateValues = (cfg: ScriptCfg) => {
	updateValuesIn(sections.global, cfg.global);
	updateThisChannel();
	for (const key in cfg.flags) {
		flags[key as FlagName].checked = cfg.flags[key as FlagName];
	}
};
