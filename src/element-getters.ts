import { $ } from './utils';

export const plr = () => $('movie_player');
export const aboveTheFold = () => $('above-the-fold');
export const actionsBar = () =>
	$('actions')?.querySelector('ytd-menu-renderer');

const getPlrGetter =
	(plr: HTMLElement) =>
	(selector: string) =>
	<T extends Element>() =>
		plr.querySelector<T>(selector);

export const plrGetters = (plr: HTMLElement) => {
	const get = getPlrGetter(plr);
	return {
		ad: get('.ytp-ad-player-overlay'),
		video: get('.html5-main-video'),
		subtitlesBtn: get('.ytp-subtitles-button'),
		muteBtn: get('.ytp-mute-button'),
		menu: {
			element: get('.ytp-settings-menu'),
			btn: get('.ytp-settings-button'),
		},
	};
};

export const plrMenuItemsGetter =
	<T extends Element>(menu: HTMLElement) =>
	() =>
		menu.querySelectorAll<T>('.ytp-menuitem[role="menuitem"]');

export const menuSubItems = (item: HTMLElement) =>
	item.querySelectorAll<HTMLElement>('.ytp-menuitem-label');

export const channelUsernameElementGetter = (aboveTheFold: HTMLElement) => () =>
	aboveTheFold.querySelector<HTMLAnchorElement>('.ytd-channel-name > a');

export const artistChannelBadge = (aboveTheFold: HTMLElement) =>
	aboveTheFold.querySelector<HTMLAnchorElement>(
		'.badge-style-type-verified-artist'
	);

export const videoPlr = () => document.querySelector('.html5-video-player');
export const videoPlrCaptions = (plr: Element) =>
	plr.querySelectorAll('.captions-text > span');

export const popupContainer = () =>
	document.querySelector('ytd-popup-container');
