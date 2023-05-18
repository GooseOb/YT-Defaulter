const { dest, watch, series } = require('gulp');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');
const { readFile } = require('fs/promises');
const through2 = require('through2');

let header;
const updateHeader = async (done) => {
	header = await readFile('header.txt', 'utf-8');
	done?.();
};

const processText = (text) => `\n(function(){${text
	.replace(/ {4}/g, '\t')
}})();`.replace(/^/, header);

const process = () => tsProject.src()
	.pipe(tsProject()).js
	.pipe(through2.obj((file, _, cb) => {
		if (file.isBuffer())
			file.contents = Buffer.from(processText(file.contents.toString()));
		cb(null, file);
	}))
	.pipe(dest('.'));

exports.default = async () => {
	await updateHeader();
	process();
	watch('header.txt', series(updateHeader, process));
	watch('index.ts', process);
};