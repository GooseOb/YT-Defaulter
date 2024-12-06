import { readFile } from 'node:fs/promises';
import type { BuildUserscriptConfig } from 'bun-build-userscript';

const define: Record<string, string> = {};

const raw = await readFile('constants.ts', 'utf8');
const pattern = /(\S+):\s*([^,;]+)/g;

let tmp: RegExpExecArray | null;
while ((tmp = pattern.exec(raw))) {
	define[tmp[1]] = tmp[2];
}

export default {
	// @ts-expect-error
	naming: 'dist/index.js',
	define,
	userscript: {
		logErrors: !process.argv.includes('--build'),
		transform: (code: string) =>
			code
				.replace(/\["([^"]+)"]:/g, '$1:')
				.replace(/(\S)\["([^"]+)"]/g, '$1.$2'),
	},
} satisfies BuildUserscriptConfig;
