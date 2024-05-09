import { readFile } from 'node:fs/promises';
import { BunBuildUserscriptConfig } from 'bun-build-userscript';

const define: Record<string, string> = {};

const raw = (await readFile('index.ts', 'utf8')).match(/declare const.+?;/s)[0];
const pattern = /(\S+): (\S+)[,;]/g;

let tmp;
while ((tmp = pattern.exec(raw))) define[tmp[1]] = tmp[2];

export default {
	naming: 'dist.js',
	define,
	userscript: {
		logErrors: !process.argv.includes('--build'),
	},
} satisfies BunBuildUserscriptConfig;
