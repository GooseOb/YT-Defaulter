const gulp = require('gulp');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');
const replace = require('gulp-replace');
const {readFile} = require('fs/promises');

const header = readFile('header.txt', 'utf-8');

gulp.task('default',
    async () => tsProject.src()
        .pipe(tsProject()).js
        .pipe(replace(/\s*\/\/ @ts-ignore/g, ''))
        .pipe(replace(/ {4}/g, '\t'))
        .pipe(replace(/\n\t/g, '\n'))
        .pipe(replace(/^/, await header))
        .pipe(gulp.dest('.'))
);