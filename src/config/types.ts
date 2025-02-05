export type FlagName =
	| 'shortsToRegular'
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

export type Cfg = YtCfg & {
	customSpeed?: string;
};

export type Setting = keyof Cfg;

export type ScriptCfg = {
	_v: number;
	global: Cfg;
	channels: Record<string, Cfg>;
	flags: Record<FlagName, boolean>;
};
