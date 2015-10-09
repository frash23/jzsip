# JzSip
Tiny & fast library for reading ZIP files in your browser with multi-threading (IE10+). 
Supports pretty much any browser. Works in IE11's simulated IE5.
![Yes, it's >3KB after gzip](https://raw.githubusercontent.com/frash23/jzsip/master/filesize.png)

Why?
---
This was made for a project where end-developers are supposed to easily create
a bundle of assets for their project, so we needed to support an archive format.

Everything for regular archives should be supported *except* encrypted files
and writing to the Zip-file.

Inflating is slow. Use it if you have lots of text or other easily compressible media, otherwise avoid it.


Usage
---
Load your `jzsip` script of choice before your code using ZIP, then:
```
// Load a zip file
new JzSip('myFiles.zip', function(zip) {
	/* Do stuff with your zip */
	zip.getFile('text.txt', alert);
});

// Load and display an image in the <body> (IE9+)
zip.getFile('Images/myImage.png', function(imgData) {
	var imgElem = document.createElement('img');
	imgElem.src = 'data:image/png;base64,'+ imgData;
	document.body.appendChild(imgElem);
}, 'base64');
```

For live demos, check the `test` folder.
Also hosted [here](http://dev.pj.gy/jzsip/test/).

Generating minified scripts
---
All fallback code is annotated. If you do not intend supporing IE9 and below, you can strip it out using this `sed` command:
```
sed '\|//@FALLBACK|d' jzsip.js | perl -0pe 's/\/\*\@FALLBACK START.*?\@FALLBACK END\*\///sg > minified/jzsip_nofallback.js
```
To minify a script, use:
```
// Minify jzsip.js -> minified/jzsip.min.js
uglifyjs --mangle --mangle-props --reserved-file uglify.js --comments --compress unsafe jzsip.js -o minified/jzsip.min.js

// Minify minified/jzsip_nofallback.js -> minified/jzsip_nofallback.min.js
uglifyjs --mangle --mangle-props --reserved-file uglify.js --comments --compress unsafe minified/jzsip_nofallback.js -o minified/jzsip_nofallback.min.js
```
Of course, `jzsip_nofallback.min.js` should provide the smallest filesize.
