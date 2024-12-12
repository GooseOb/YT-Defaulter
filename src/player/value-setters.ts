import * as config from '../config';
import * as logger from '../logger';
import { plr } from '../player';
import type { YtSettingName } from './types';

type Comparator = (target: string, current: string) => boolean;
const comparators: { readonly [P in YtSettingName]: Comparator } = {
	// assuming the search is from the top
	[QUALITY]: (target, current) =>
		+target >= parseInt(current) &&
		(config.value.flags.enhancedBitrate ||
			!current.toLowerCase().includes('premium')),
	[SPEED]: (target, current) => target === current,
};
type ValueSetterHelpers = {
	_ytSettingItem(settingName: YtSettingName, value: string): void;
};
type ValueSetters = {
	[P in config.Setting]: (value: Required<config.Cfg>[P]) => void;
};

export const valueSetters: ValueSetters & ValueSetterHelpers = {
	_ytSettingItem(settingName, value) {
		const isOpen = plr.menu.isOpen();
		const compare = comparators[settingName];
		const btn = plr.menu.findInItem(settingName, (btn) =>
			compare(value, btn.textContent)
		);
		if (btn) {
			btn.click();
			plr.menu.setOpen(isOpen);
		}
	},
	speed(value) {
		this._ytSettingItem(SPEED, plr.isSpeedApplied ? plr.speedNormal : value);
		plr.isSpeedApplied = !plr.isSpeedApplied;
	},
	customSpeed(value) {
		try {
			plr.video.playbackRate = plr.isSpeedApplied ? 1 : +value;
		} catch {
			logger.outOfRange('Custom speed');
			return;
		}
		plr.isSpeedApplied = !plr.isSpeedApplied;
	},
	subtitles(value) {
		if (plr.subtitlesBtn.ariaPressed !== value.toString())
			plr.subtitlesBtn.click();
	},
	volume(value) {
		const num = +value;
		const isMuted = plr.muteBtn.dataset.titleNoTooltip !== 'Mute';
		if (num === 0) {
			if (!isMuted) plr.muteBtn.click();
		} else {
			if (isMuted) plr.muteBtn.click();
			try {
				plr.video.volume = num / 100;
			} catch {
				logger.outOfRange('Volume');
			}
		}
	},
	quality(value) {
		this._ytSettingItem(QUALITY, value);
	},
};
