#!/bin/sh

# First run `npm install` to install dependencies, then you can run this script
# to start `watchify`, which will update extension/bundle.js whenever
# src/app/app.js and dependencies are modified.

./node_modules/watchify/bin/cmd.js -v --debug -t [ babelify --presets [ es2015 react ] --plugins [transform-object-rest-spread] ] src/app/app.js -o extension/bundle.js
