import { delay, until, restoreFocusAfter, findInNodeList } from '../utils';

export const plr = {
	async set(el: HTMLElement) {
		this.isSpeedApplied = false;
		await delay(1_000);
		const getAd = () => el.querySelector('.ytp-ad-player-overlay');
		await until(getAd, (ad) => !ad, 200_000);
		this.video ||= el.querySelector('.html5-main-video');
		this.subtitlesBtn ||= el.querySelector('.ytp-subtitles-button');
		this.muteBtn ||= el.querySelector('.ytp-mute-button');

		this.menu.element ||= el.querySelector('.ytp-settings-menu');
		this.menu._btn ||= el.querySelector('.ytp-settings-button');
		const clickBtn = () => {
			this.menu._btn.click();
		};

		restoreFocusAfter(clickBtn);
		await delay(50);
		restoreFocusAfter(clickBtn);

		const getMenuItems = () =>
			plr.menu.element.querySelectorAll<YtSettingItem>(
				'.ytp-menuitem[role="menuitem"]'
			);
		plr.menu.setSettingItems(await until(getMenuItems, (arr) => !!arr.length));
		if (!this.speedNormal)
			restoreFocusAfter(() => {
				this.speedNormal = plr.menu.findInItem(
					SPEED,
					(btn) => !+btn.textContent
				).textContent;
			});
	},
	isSpeedApplied: false,
	speedNormal: '',
	element: null as HTMLElement,
	video: null as HTMLVideoElement,
	subtitlesBtn: null as HTMLButtonElement,
	muteBtn: null as HTMLButtonElement,
	menu: {
		element: null as HTMLElement,
		_btn: null as HTMLElement,
		isOpen() {
			return this.element.style.display !== 'none';
		},
		setOpen(bool: boolean) {
			if (bool !== this.isOpen()) this._btn.click();
		},
		openItem(item: Readonly<YtSettingItem>) {
			this.setOpen(true);
			item.click();
			return this.element.querySelectorAll(
				'.ytp-panel-animate-forward .ytp-menuitem-label'
			);
		},
		settingItems: {
			[SPEED]: null,
			[QUALITY]: null,
		} as Record<YtSettingName, YtSettingItem | null>,
		setSettingItems(items: DeepReadonly<NodeListOf<YtSettingItem>>) {
			const findIcon = (d: string) =>
				findInNodeList(items, (el) => !!el.querySelector(`path[d="${d}"]`));

			this.settingItems[SPEED] = findIcon(SPEED_ICON_D);
			this.settingItems[QUALITY] = findIcon(QUALITY_ICON_D);
		},
		findInItem(
			name: YtSettingName,
			finder: (item: Readonly<HTMLElement>) => boolean
		) {
			return findInNodeList(this.openItem(this.settingItems[name]), finder);
		},
	},
};
