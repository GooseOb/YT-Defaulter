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

			this.settingItems[SPEED] = findIcon(
				'M10,8v8l6-4L10,8L10,8z M6.3,5L5.7,4.2C7.2,3,9,2.2,11,2l0.1,1C9.3,3.2,7.7,3.9,6.3,5z            M5,6.3L4.2,5.7C3,7.2,2.2,9,2,11 l1,.1C3.2,9.3,3.9,7.7,5,6.3z            M5,17.7c-1.1-1.4-1.8-3.1-2-4.8L2,13c0.2,2,1,3.8,2.2,5.4L5,17.7z            M11.1,21c-1.8-0.2-3.4-0.9-4.8-2 l-0.6,.8C7.2,21,9,21.8,11,22L11.1,21z            M22,12c0-5.2-3.9-9.4-9-10l-0.1,1c4.6,.5,8.1,4.3,8.1,9s-3.5,8.5-8.1,9l0.1,1 C18.2,21.5,22,17.2,22,12z'
			);
			this.settingItems[QUALITY] = findIcon(
				'M15,17h6v1h-6V17z M11,17H3v1h8v2h1v-2v-1v-2h-1V17z M14,8h1V6V5V3h-1v2H3v1h11V8z            M18,5v1h3V5H18z M6,14h1v-2v-1V9H6v2H3v1 h3V14z M10,12h11v-1H10V12z'
			);
		},
		findInItem(
			name: YtSettingName,
			finder: (item: Readonly<HTMLElement>) => boolean
		) {
			return findInNodeList(this.openItem(this.settingItems[name]), finder);
		},
	},
};
