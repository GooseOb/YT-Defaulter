const gulp = require('gulp');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');
const replace = require('gulp-replace');
const {readFile} = require('fs/promises');

const header = readFile('header.txt', 'utf-8');

const process = async () => tsProject.src()
	.pipe(tsProject()).js
	.pipe(replace(/ {4}/g, '\t'))
	.pipe(replace(/\n\t/g, '\n'))
	.pipe(replace(/^/, await header))
	.pipe(gulp.dest('.'));

exports.default = () => {
	process();
	gulp.watch('index.ts', process);
};