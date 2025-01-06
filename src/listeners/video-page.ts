import { untilAppear } from '../utils';
import { applySettings, setPlr } from '../player';
import { computeSettings } from '../compute-settings';
import * as get from '../element-getters';
import * as config from '../config';
import * as menu from '../menu';

export const onVideoPage = async () => {
	const aboveTheFold = await untilAppear(get.aboveTheFold);

	config.channel.username =
		(await untilAppear(get.channelUsernameElementGetter(aboveTheFold))).href ||
		'';

	untilAppear(get.plr)
		.then(setPlr)
		.then(() => {
			const doNotChangeSpeed =
				config.value.flags.standardMusicSpeed &&
				!!get.artistChannelBadge(aboveTheFold);

			applySettings(computeSettings(doNotChangeSpeed));

			if (!menu.value.element) {
				menu.init();
			}
		});

	if (menu.value.element) {
		menu.updateThisChannel(config.channel.get());
	}
};
