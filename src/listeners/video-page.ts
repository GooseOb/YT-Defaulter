import { untilAppear } from '../utils';
import { applySettings, plr } from '../player';
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
		.then((plrElement) => plr.set(plrElement))
		.then(() => {
			const doNotChangeSpeed =
				config.value.flags.standardMusicSpeed &&
				!!get.artistChannelBadge(aboveTheFold);

			applySettings(computeSettings(doNotChangeSpeed));
		});

	if (menu.value.element) {
		menu.controls.updateThisChannel(config.channel.get());
	} else {
		menu.init();
	}
};
