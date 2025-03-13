import * as get from '../element-getters';
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

export const isOpen = () => {
	return element.style.display !== 'none';
};

export const setOpen = (bool: boolean) => {
	if (bool !== isOpen()) btn.click();
};

export const openItem = (item: Readonly<YtSettingItem>) => {
	setOpen(true);
	item.click();
	return get.menuSubItems(element);
};

export const settingItems = {
	[SPEED]: null,
	[QUALITY]: null,
} as Record<YtSettingName, YtSettingItem | null>;

export const setSettingItems = (
	items: DeepReadonly<NodeListOf<YtSettingItem>>
) => {
	const findIcon = (d: string) =>
		findInNodeList(items, (el) => !!el.querySelector(`path[d="${d}"]`));

	settingItems[SPEED] = findIcon(SPEED_ICON_D);
	settingItems[QUALITY] = findIcon(QUALITY_ICON_D);
};

export const findInItem = (name: YtSettingName) =>
	untilAppear(() => settingItems[name]).then(
		(item) => (predicate: (item: Readonly<HTMLElement>) => boolean) => {
			const oldSubItems = new Set(get.menuSubItems(element));
			return findInNodeList(
				openItem(item),
				(subItem) => !oldSubItems.has(subItem) && predicate(subItem)
			);
		}
	);
