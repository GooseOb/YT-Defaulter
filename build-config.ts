import type { BuildConfigs } from 'bun-build-userscript';

export const bun: BuildConfigs['bun'] = {
	outdir: 'dist',
};

const pattern = /([A-Z_0-9]+):\s*('[^']+'|[^,;]+)/g;
const consts = Bun.file('src/constants.ts');

export const userscript: BuildConfigs['userscript'] = {
	entry: 'src',
	before: async ({ bun }) => {
		bun.define = {};
		const raw = await consts.text();
		let tmp: RegExpExecArray | null;
		while ((tmp = pattern.exec(raw))) {
			console.log(`Defining ${tmp[1]} = ${tmp[2]}`);
			bun.define[tmp[1]] = tmp[2];
		}
	},
	transform: (code) =>
		code.replace(/\["([^"]+)"]:/g, '$1:').replace(/(\S)\["([^"]+)"]/g, '$1.$2'),
};
