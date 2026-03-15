import * as get from '../element-getters';
import { trace } from '../logger';
import { findInNodeList, untilAppear } from '../utils';
import type { YtSettingItem, YtSettingName } from './types';

export const set = (getEl: ReturnType<typeof get.plrGetters>) => {
	element ||= getEl.menu.element();
	btn ||= getEl.menu.btn();
};

export let element = null as HTMLElement;

let btn = null as HTMLElement;

export const clickBtn = () => {
	btn.click();
};

export const isOpen = () => element.style.display !== 'none';

export const setOpen = (bool: boolean) => {
	if (bool !== isOpen()) btn.click();
};

export const openItem = (item: Readonly<YtSettingItem>) => {
	setOpen(true);
	item.click();
};

export const settingItems = {
	[SPEED]: null,
	[QUALITY]: null,
} as Record<YtSettingName, YtSettingItem | null>;

export const setSettingItems = (menu: Element) => {
	settingItems[SPEED] = get.speedIconItem(menu);
	settingItems[QUALITY] = get.qualityIconItem(menu);
};

export const findNormalSpeed = () =>
	untilAppear(() => settingItems[SPEED])
		.then(openItem)
		.then(() => get.firstSpeedItem(element).textContent);

export const findInItem = (
	name: YtSettingName,
	getSubItems: (element: HTMLElement) => NodeListOf<HTMLElement>
) =>
	untilAppear(() => settingItems[name]).then(
		(item) => (predicate: (item: Readonly<HTMLElement>) => boolean) => {
			const oldSubItems = new Set(get.menuSubItems(element));
			openItem(item);
			return findInNodeList(
				getSubItems(item),
				(subItem) => !oldSubItems.has(subItem) && predicate(subItem)
			);
		}
	);
