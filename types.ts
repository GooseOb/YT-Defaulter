type Dictionary = Record<
	| 'OPEN_SETTINGS'
	| 'SUBTITLES'
	| 'SPEED'
	| 'CUSTOM_SPEED'
	| 'CUSTOM_SPEED_HINT'
	| 'QUALITY'
	| 'VOLUME'
	| 'GLOBAL'
	| 'LOCAL'
	| 'SHORTS'
	| 'NEW_TAB'
	| 'COPY_SUBS'
	| 'STANDARD_MUSIC_SPEED'
	| 'ENHANCED_BITRATE'
	| 'SAVE'
	| 'DEFAULT'
	| 'EXPORT'
	| 'IMPORT',
	string
>;
type FlagName =
	| 'shortsToUsual'
	| 'newTab'
	| 'copySubs'
	| 'standardMusicSpeed'
	| 'enhancedBitrate';
type YTCfg = {
	speed?: string;
	quality?: string;
	volume?: string;
	subtitles?: boolean;
};
type Cfg = YTCfg & {
	customSpeed?: string;
};
type Setting = keyof Cfg;
type YTSetting = keyof YTCfg;
type ScriptCfg = {
	_v: number;
	global: Cfg;
	channels: Record<string, Cfg>;
	flags: Record<FlagName, boolean>;
};
type Menu = {
	element: HTMLDivElement;
	btn: HTMLButtonElement;
	firstElement: { focus(): void };
	isOpen: boolean;
	width: number;
	_closeListener: {
		onClick(e: Event): void;
		onKeyUp(e: KeyboardEvent): void;
		add(): void;
		remove(): void;
	};
	_setOpen(bool: boolean): void;
	toggle(): void;
	fixPosition(): void;
};
type YtSettingItem = HTMLDivElement & { role: 'menuitem' };
type YtMenu = {
	element: HTMLElement & ParentNode;
	_btn: HTMLElement;
	updatePlayer(plr: HTMLElement): Promise<void>;
	isOpen(): boolean;
	setOpen(bool: boolean): void;
	openItem(this: YtMenu, item: YtSettingItem): NodeListOf<HTMLElement>;
	findInItem(
		item: YtSettingItem,
		callback: (item: HTMLElement) => boolean
	): HTMLElement;
};
type Hint = {
	element: HTMLDivElement;
	hide(): void;
	show(msg?: string): void;
};
type InputWithHint = HTMLInputElement & { hint: Hint };
