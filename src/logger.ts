export const log = (...msgs: readonly any[]) => {
	console.log('[YT-Defaulter]', ...msgs);
};
export const err = (...msgs: readonly any[]) => {
	console.error('[YT-Defaulter]', ...msgs);
};
export const outOfRange = (what: any) => {
	err(what, 'value is out of range');
};
export const trace = (msg: any, label?: string) => (
	console.log(msg, label), msg
);
