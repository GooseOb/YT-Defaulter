import * as config from './config';
import { plr } from './player';

export const computeSettings = (doNotChangeSpeed: boolean): Cfg => {
	const settings = {
		...config.value.global,
		...config.channel.get(),
	};
	const isChannelSpeed = 'speed' in config.channel.get();
	const isChannelCustomSpeed = 'customSpeed' in config.channel.get();
	if (doNotChangeSpeed) {
		settings.speed = plr.speedNormal;
		delete settings.customSpeed;
	} else if (isChannelCustomSpeed) {
		delete settings.speed;
	} else if (isChannelSpeed) {
		delete settings.customSpeed;
	}
	return settings;
};
