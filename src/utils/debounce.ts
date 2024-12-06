export const debounce = <TParams extends any[]>(
	callback: (...args: TParams) => void,
	delay: number
): ((...args: TParams) => void) => {
	let timeout: number;
	return function (...args) {
		clearTimeout(timeout);
		timeout = window.setTimeout(() => {
			callback.apply(this, args);
		}, delay);
	};
};
