import { $ } from './utils';

export const plr = () => $('movie_player');
export const aboveTheFold = () => $('above-the-fold');
export const actionsBar = () =>
	$('actions')?.querySelector('ytd-menu-renderer');

export const plrGetters = (plr: HTMLElement) => ({
	ad: () => plr.querySelector('.ytp-ad-player-overlay'),
	video: () => plr.querySelector('.html5-main-video'),
	subtitlesBtn: () => plr.querySelector('.ytp-subtitles-button'),
	muteBtn: () => plr.querySelector('.ytp-mute-button'),
	menu: {
		element: () => plr.querySelector('.ytp-settings-menu'),
		btn: () => plr.querySelector('.ytp-settings-button'),
	},
});

export const plrMenuItemsGetter =
	<T extends Element>(menu: HTMLElement) =>
	() =>
		menu.querySelectorAll<T>('.ytp-menuitem[role="menuitem"]');

export const menuSubItems = (item: HTMLElement) =>
	item.querySelectorAll('.ytp-panel-animate-forward .ytp-menuitem-label');

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
