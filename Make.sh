#!/usr/bin/env bash

# Generate version without fallback for IE9
sed '\|//@FALLBACK|d' jzsip.js | perl -0pe 's/\/\*\@FALLBACK START.*?\@FALLBACK END\*\///sg' > minified/jzsip_nofallback.js

# Minify with uglifyjs
uglifyjs --mangle --mangle-props --reserved-file uglify.js --comments --compress unsafe jzsip.js -o minified/jzsip.min.js
uglifyjs --mangle --mangle-props --reserved-file uglify.js --comments --compress unsafe minified/jzsip_nofallback.js -o minified/jzsip_nofallback.min.js
