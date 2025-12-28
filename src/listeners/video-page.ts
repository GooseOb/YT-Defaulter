import { computeSettings } from '../compute-settings';
import * as config from '../config';
import * as get from '../element-getters';
import * as menu from '../menu';
import { applySettings, setPlr } from '../player';
import { untilAppear } from '../utils';

export const onVideoPage = () => {
	const usernameSettingPromise = untilAppear(get.aboveTheFold)
		.then(get.channelUsernameElementGetter)
		.then(untilAppear)
		.then(({ href }) => {
			config.username.val = href || '';
		});

	untilAppear(get.plr)
		.then(setPlr)
		.then(() => usernameSettingPromise)
		.then(() => {
			const doNotChangeSpeed =
				config.value.flags.standardMusicSpeed &&
				get.genre()?.content === 'Music';

			applySettings(computeSettings(doNotChangeSpeed));

			if (!menu.element) {
				menu.init();
			}
		});

	if (menu.element) {
		menu.updateThisChannel();
	}
};
