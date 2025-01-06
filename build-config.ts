import { readFile } from 'node:fs/promises';

const pattern = /([A-Z_0-9]+):\s*('[^']+'|[^,;]+)/g;

export const bun = {
	outdir: 'dist',
};

export const userscript = {
	before: async ({ bun }) => {
		bun.define = {};
		const raw = await readFile('src/constants.ts', 'utf8');
		let tmp: RegExpExecArray | null;
		while ((tmp = pattern.exec(raw))) {
			bun.define[tmp[1]] = tmp[2];
		}
	},
	entry: 'src',
	transform: (code) =>
		code.replace(/\["([^"]+)"]:/g, '$1:').replace(/(\S)\["([^"]+)"]/g, '$1.$2'),
};
