import * as config from './config';
import { speedNormal } from './player';

/**
 * Priority of speed settings:
 * 0. Use normal speed
 * 1. Channel custom speed
 * 2. Channel speed
 * 3. Global custom speed
 * 4. Global speed
 */
export const computeSettings = (doUseNormalSpeed: boolean): config.Cfg => {
	const channel = config.channel();
	const settings = {
		...config.value.global,
		...channel,
	};
	if (doUseNormalSpeed) {
		settings.speed = speedNormal;
		delete settings.customSpeed;
	} else if ('customSpeed' in channel) {
		delete settings.speed;
	} else if ('speed' in channel) {
		delete settings.customSpeed;
	} else if ('customSpeed' in settings) {
		delete settings.speed;
	}
	return settings;
};
