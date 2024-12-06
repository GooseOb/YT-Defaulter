export const validateVolume = (value: string) => {
	const num = +value;
	return num < 0 || num > 100
		? 'out of range'
		: isNaN(num)
			? 'not a number'
			: null;
};
