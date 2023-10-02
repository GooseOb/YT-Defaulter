import {readFile} from 'node:fs/promises';
import {BunBuildUserscriptConfig} from 'bun-build-userscript';

const define: Record<string, string> = {};

for (const [, key, value] of
	(await readFile('index.ts', 'utf8')).match(/declare const.+?;/s)[0].matchAll(/(\S+): (\S+)[,;]/g)
) define[key] = value;

export default {
	define,
	naming: 'index.js',
	userscript: {
		logErrors: !process.argv.includes('--build')
	}
} satisfies BunBuildUserscriptConfig;