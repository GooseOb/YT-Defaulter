import * as config from '../config';
import * as logger from '../logger';
import * as plr from './plr';
import * as menu from './menu';
import type { YtSettingName } from './types';

type Comparator = (target: string, current: string) => boolean;
const comparators = {
	// assuming the search is from the top
	[QUALITY]: (target, current) =>
		+target >= parseInt(current) &&
		(config.value.flags.enhancedBitrate ||
			!current.toLowerCase().includes('premium')),
	[SPEED]: (target, current) => target === current,
} satisfies { readonly [P in YtSettingName]: Comparator };

const setYT = (settingName: YtSettingName) => (value: string) => {
	const isOpen = menu.isOpen();
	const compare = comparators[settingName];
	const btn = menu.findInItem(settingName, (btn) =>
		compare(value, btn.textContent)
	);
	if (btn) {
		btn.click();
	}
	menu.setOpen(isOpen);
};

export const valueSetters = {
	speed: (value) => {
		setYT(SPEED)(plr.isSpeedApplied ? plr.speedNormal : value);
		plr.toggleSpeed();
	},
	customSpeed: (value) => {
		try {
			plr.video.playbackRate = plr.isSpeedApplied ? 1 : +value;
			plr.toggleSpeed();
		} catch {
			logger.outOfRange('Custom speed');
		}
	},
	subtitles: (value) => {
		if (plr.subtitlesBtn.ariaPressed !== value.toString())
			plr.subtitlesBtn.click();
	},
	volume: (value) => {
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
	quality: setYT(QUALITY),
} satisfies {
	[P in config.Setting]: (value: Required<config.Cfg>[P]) => void;
};
