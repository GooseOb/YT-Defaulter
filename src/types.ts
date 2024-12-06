type DeepReadonly<T> = T extends (infer R)[]
	? DeepReadonlyArray<R>
	: T extends Function
		? T
		: T extends object
			? DeepReadonlyObject<T>
			: T;
type DeepReadonlyArray<T> = ReadonlyArray<DeepReadonly<T>>;
type DeepReadonlyObject<T> = {
	readonly [P in keyof T]: DeepReadonly<T[P]>;
};

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
type ReadonlyInputWithHint = DeepReadonly<HTMLInputElement & { hint: Hint }>;
type Control = HTMLSelectElement | HTMLInputElement;
type SettingControls = Record<Setting, Control>;
type Props<T extends HTMLElement> = Partial<T> & object;
type ControlItem<T extends HTMLElement> = { item: HTMLDivElement; elem: T };
type Ref<T> = { value: T };
