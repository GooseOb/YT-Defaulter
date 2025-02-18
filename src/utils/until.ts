export const until = <T>(
	getItem: () => T,
	check: (item: T) => boolean,
	msToWait = 10_000,
	msReqTimeout = 20
) =>
	new Promise<T>((res, rej) => {
		const item = getItem();
		if (check(item)) return res(item);
		const reqLimit = msToWait / msReqTimeout;
		let i = 0;
		const interval = setInterval(() => {
			const item = getItem();
			if (check(item)) {
				clearInterval(interval);
				res(item);
			} else if (++i > reqLimit) {
				clearInterval(interval);
				rej(new Error(`Timeout: item ${getItem.name} wasn't found`));
			}
		}, msReqTimeout);
	});

export const untilAppear = <T>(getItem: () => T, msToWait?: number) =>
	until<T>(getItem, Boolean, msToWait);
