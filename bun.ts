import { readFile, watch } from "node:fs/promises"

const postprocess = (text: string) =>
	text.replace(/(?:\\u\S{4})+/g, ($0) => JSON.parse(`"${$0}"`));

let startTime = performance.now();
const build = () =>
	Bun.build({
		entrypoints: ['index.ts'],
		outdir: '.'
	}).then(async (output) => {
		const {path} = output.outputs[0];
		await Bun.write(
			path,
			await readFile('header.txt', 'utf-8') + '\n' +
			postprocess(await readFile(path, 'utf-8')));
		console.log(`\x1b[35m[build]\x1b[0m done in ${performance.now() - startTime} ms`);
	})

await build();

if (process.argv.includes('--build')) process.exit(0);

const watcher = watch('.');
for await (const event of watcher) {
	const {filename} = event;
	if (filename === 'index.ts' || filename === 'header.txt') {
		startTime = performance.now();
		build();
	}
}