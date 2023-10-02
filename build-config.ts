import {readFile} from 'node:fs/promises';

const define = {};

for (const [, key, value] of
	(await readFile('index.ts', 'utf8')).match(/declare const.+?;/s)[0].matchAll(/(\S+): (\S+),/g)
) { // @ts-ignore
	define[key] = value;
}

export default {
	define,
	naming: 'index.js'
}