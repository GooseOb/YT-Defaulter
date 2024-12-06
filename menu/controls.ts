import { text } from '../text';

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

export const controls = {
	global: channelControls(),
	thisChannel: channelControls(),
	flags: {
		shortsToUsual: null as HTMLInputElement,
		newTab: null as HTMLInputElement,
		copySubs: null as HTMLInputElement,
		standardMusicSpeed: null as HTMLInputElement,
		enhancedBitrate: null as HTMLInputElement,
	} satisfies Record<FlagName, HTMLInputElement>,
	updateThisChannel(channelConfig: Cfg) {
		updateValuesIn(this.thisChannel, channelConfig);
	},
	updateValues(cfg: ScriptCfg) {
		updateValuesIn(this.global, cfg.global);
		this.updateThisChannel();
		for (const key in cfg.flags) {
			this.flags[key as FlagName].checked = cfg.flags[key as FlagName];
		}
	},
};
