import { readFile } from 'node:fs/promises';
import type { BuildUserscriptConfig } from 'bun-build-userscript';

const define: Record<string, string> = {};

const rawArr = /declare const[^;]+?;/.exec(await readFile('index.ts', 'utf8'));

if (rawArr) {
	const [raw] = rawArr;
	const pattern = /(\S+):\s*([^,;]+)/g;

	let tmp: RegExpExecArray | null;
	while ((tmp = pattern.exec(raw))) {
		define[tmp[1]] = tmp[2];
	}
}

export default {
	// @ts-expect-error
	naming: 'dist/index.js',
	define,
	userscript: {
		logErrors: !process.argv.includes('--build'),
	},
} satisfies BuildUserscriptConfig;
