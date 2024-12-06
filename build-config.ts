import { readFile } from 'node:fs/promises';
import type { BuildUserscriptConfig } from 'bun-build-userscript';

const define: Record<string, string> = {};

const raw = await readFile('src/constants.ts', 'utf8');
const pattern = /([A-Z_0-9]+):\s*('[^']+'|[^,;]+)/g;

let tmp: RegExpExecArray | null;
while ((tmp = pattern.exec(raw))) {
	define[tmp[1]] = tmp[2];
}

export default {
	// @ts-expect-error
	entrypoints: ['src/index.ts'],
	naming: 'dist/index.js',
	define,
	userscript: {
		logErrors: process.argv.includes('--watch'),
		transform: (code: string) =>
			code
				.replace(/\["([^"]+)"]:/g, '$1:')
				.replace(/(\S)\["([^"]+)"]/g, '$1.$2'),
	},
} satisfies BuildUserscriptConfig;
