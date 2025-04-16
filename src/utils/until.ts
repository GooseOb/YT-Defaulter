export const until = <T>(
	getItem: () => T,
	check: (item: T) => boolean,
	timeout = 10_000,
	interval = 20
) =>
	new Promise<T>((res, rej) => {
		let item = getItem();
		if (check(item)) return res(item);
		const limit = timeout / interval;
		let i = 0;
		const id = setInterval(() => {
			item = getItem();
			if (check(item)) {
				clearInterval(id);
				res(item);
			} else if (++i > limit) {
				clearInterval(id);
				rej(new Error(`Timeout: item ${getItem.name} wasn't found`));
			}
		}, interval);
	});

export const untilAppear = <T>(getItem: () => T, msToWait?: number) =>
	until<T>(getItem, Boolean, msToWait);
