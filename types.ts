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
	| 'SAVE'
	| 'SAVED'
	| 'DEFAULT',
	string
>;
type FlagName = 'shortsToUsual' | 'newTab' | 'copySubs' | 'standardMusicSpeed';
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
	isOpen: boolean;
	btn: HTMLButtonElement;
	width: number;
	_closeListener: {
		onClick(e: Event): void;
		onKeyUp(e: KeyboardEvent): void;
		add(): void;
		remove(): void;
	};
	firstElement: { focus(): void };
	_open(): void;
	_close(): void;
	toggle(): void;
	fixPosition(): void;
};
type YtSettingItem = HTMLDivElement & { role: 'menuitem' };
type YtMenu = {
	updatePlayer(plr: HTMLElement): void;
	element: HTMLElement & ParentNode;
	_btn: HTMLElement;
	_isOpen(): boolean;
	open(): void;
	close(): void;
	openItem(this: YtMenu, item: YtSettingItem): NodeListOf<HTMLElement>;
};
type HintElem = HTMLDivElement & {
	hide(): void;
	show(msg?: string): void;
};
type InputWithHint = HTMLInputElement & { hint: HintElem };
