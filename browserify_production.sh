#!/bin/sh

# First run `npm install` to install dependencies, then you can run this script
# to start `browserify`, which will prepare extension/bundle.js for production.

./node_modules/browserify/bin/cmd.js src/app/app.js -t [ babelify --presets [ es2015 react ] --plugins [transform-object-rest-spread] ] -g [ envify --NODE_ENV production ] -g uglifyify | ./node_modules/uglify-js/bin/uglifyjs --compress --mangle > extension/bundle.js
