import gulp from 'gulp';
import ts from 'gulp-typescript';
import through2 from 'through2';
import { readFile } from 'fs/promises';

const tsProject = ts.createProject('tsconfig.json');

let header;
const updateHeader = async (done) => {
	header = await readFile('header.txt', 'utf-8');
	done?.();
};
await updateHeader();

const processText = (text) => `\n(function(){\n${text
	.replace(/ {4}/g, '\t')
}\n})();`.replace(/^/, header);

export const build = () => tsProject.src()
	.pipe(tsProject()).js
	.pipe(through2.obj((file, _, cb) => {
		if (file.isBuffer())
			file.contents = Buffer.from(processText(file.contents.toString()));
		cb(null, file);
	}))
	.pipe(gulp.dest('.'));

export const watch = () => {
	build();
	gulp.watch('header.txt', gulp.series(updateHeader, build));
	gulp.watch('index.ts', build);
};

export default watch;