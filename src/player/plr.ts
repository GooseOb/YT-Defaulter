import * as get from '../element-getters';
import { delay, until, restoreFocusAfter, findInNodeList } from '../utils';

export const plr = {
	async set(el: HTMLElement) {
		const getEl = get.plrGetters(el);
		this.isSpeedApplied = false;
		await delay(1_000);
		await until(getEl.ad, (ad) => !ad, 200_000);
		this.video ||= getEl.video();
		this.subtitlesBtn ||= getEl.subtitlesBtn();
		this.muteBtn ||= getEl.muteBtn();

		this.menu.element ||= getEl.menu.element();
		this.menu._btn ||= getEl.menu.btn();
		const clickBtn = () => {
			this.menu._btn.click();
		};

		restoreFocusAfter(clickBtn);
		await delay(50);
		restoreFocusAfter(clickBtn);

		plr.menu.setSettingItems(
			await until(
				get.plrMenuItemsGetter<YtSettingItem>(plr.menu.element),
				(arr) => !!arr.length
			)
		);
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
			return get.menuSubItems(this.element);
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
			const prevItems = new Set(get.menuSubItems(this.element));
			return findInNodeList(
				this.openItem(this.settingItems[name]),
				(item) => !prevItems.has(item) && finder(item)
			);
		},
	},
};
