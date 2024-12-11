export const log = (...msgs: string[]) => {
	console.log('[YT-Defaulter]', ...msgs);
};
export const err = (...msgs: readonly string[]) => {
	console.error('[YT-Defaulter]', ...msgs);
};
export const outOfRange = (what: string) => {
	err(what, 'value is out of range');
};
export const trace = (msg: any, label?: string) => (
	console.log(msg, label), msg
);
