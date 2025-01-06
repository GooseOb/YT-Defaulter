export const debounce = <TParams extends any[]>(
	callback: (...args: TParams) => void,
	delay: number
): ((...args: TParams) => void) => {
	let timeout: number;
	return (...args) => {
		clearTimeout(timeout);
		timeout = window.setTimeout(() => {
			callback(...args);
		}, delay);
	};
};
