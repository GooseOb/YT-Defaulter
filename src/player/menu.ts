import * as get from '../element-getters';
import { findInNodeList, untilAppear } from '../utils';
import * as ICON_DS from './icon-ds';
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
	return get.menuSubItems(element);
};

export const settingItems = {
	[SPEED]: null,
	[QUALITY]: null,
} as Record<YtSettingName, YtSettingItem | null>;

export const setSettingItems = (
	items: DeepReadonly<NodeListOf<YtSettingItem>>
) => {
	const findIcon = (ds: readonly string[]) =>
		findInNodeList(
			items,
			(el) => !!el.querySelector(ds.map((d) => `path[d="${d}"]`).join(','))
		);

	settingItems[SPEED] = findIcon(ICON_DS.SPEED);
	settingItems[QUALITY] = findIcon(ICON_DS.QUALITY);
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
