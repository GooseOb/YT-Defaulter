type FlagName =
	| 'shortsToUsual'
	| 'newTab'
	| 'copySubs'
	| 'standardMusicSpeed'
	| 'enhancedBitrate';
type YtCfg = {
	speed?: string;
	quality?: string;
	volume?: string;
	subtitles?: boolean;
};
type Cfg = YtCfg & {
	customSpeed?: string;
};
type Setting = keyof Cfg;
type ScriptCfg = {
	_v: number;
	global: Cfg;
	channels: Record<string, Cfg>;
	flags: Record<FlagName, boolean>;
};
type YtSettingItem = HTMLDivElement & { role: 'menuitem' };
type InputWithHint = HTMLInputElement & { hint: Hint };
type Control = HTMLSelectElement | HTMLInputElement;
type SettingControls = Record<Setting, Control>;
