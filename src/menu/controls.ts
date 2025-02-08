import { text } from '../text';
import type { SettingControls } from './types';
import type { Cfg, ScriptCfg } from '../config';
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

export type Flag = {
	elem: HTMLInputElement;
	text: string;
	id: string;
};

export const flags: Record<string, Flag> = {
	shortsToRegular: {
		elem: null,
		id: 'shorts',
		text: text.SHORTS,
	},
	newTab: {
		elem: null,
		id: 'new-tab',
		text: text.NEW_TAB,
	},
	copySubs: {
		elem: null,
		id: 'copy-subs',
		text: text.COPY_SUBS,
	},
	standardMusicSpeed: {
		elem: null,
		id: 'standard-music-speed',
		text: text.STANDARD_MUSIC_SPEED,
	},
	enhancedBitrate: {
		elem: null,
		id: 'enhanced-bitrate',
		text: text.ENHANCED_BITRATE,
	},
	hideShorts: {
		elem: null,
		id: 'hide-shorts',
		text: text.HIDE_SHORTS,
	},
};

export type FlagName = keyof typeof flags;

export const updateThisChannel = () => {
	updateValuesIn(sections.thisChannel, config.channel());
};

export const updateValues = (cfg: ScriptCfg) => {
	updateValuesIn(sections.global, cfg.global);
	updateThisChannel();
	for (const key in cfg.flags) {
		flags[key as FlagName].elem.checked = cfg.flags[key as FlagName];
	}
};
