export const logger = {
	// log(...msgs: string[]) {
	// 	console.log('[YT-Defaulter]', ...msgs);
	// },
	err(...msgs: readonly string[]) {
		console.error('[YT-Defaulter]', ...msgs);
	},
	outOfRange(what: string) {
		this.err(what, 'value is out of range');
	},
};
