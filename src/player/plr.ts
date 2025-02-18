import * as get from '../element-getters';
import { delay, until, restoreFocusAfter } from '../utils';
import type { YtSettingItem } from './types';
import * as menu from './menu';

export const setPlr = async (el: HTMLElement) => {
	const getEl = get.plrGetters(el);
	await delay(1_000);
	await until(getEl.ad, (ad) => !ad, 200_000);
	video ||= getEl.video();
	subtitlesBtn ||= getEl.subtitlesBtn();
	muteBtn ||= getEl.muteBtn();

	menu.set(getEl);

	restoreFocusAfter(menu.clickBtn);
	await delay(50);
	restoreFocusAfter(menu.clickBtn);

	menu.setSettingItems(
		await until(
			get.plrMenuItemsGetter<YtSettingItem>(menu.element),
			(arr) => !!arr.length
		)
	);
	if (!speedNormal)
		restoreFocusAfter(() => {
			speedNormal = menu.findInItem(
				SPEED,
				(btn) => !+btn.textContent
			).textContent;
		});
};

export const isSpeed = (value: number) => video.playbackRate === value;
export let speedNormal = '';
export let video = null as HTMLVideoElement;
export let subtitlesBtn = null as HTMLButtonElement;
export let muteBtn = null as HTMLButtonElement;
