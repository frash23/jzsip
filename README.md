# jzsip
5KB read-only ZIP implementation in browser-sideJavaScript. Supports compression.
![Yes, it's 5KB after gzip -6](https://raw.githubusercontent.com/frash23/jzsip/master/5kb_after_gzip.png)

Why?
---
This was made for a project where end-developers are supposed to easily create
a bundle of assets for their project and load it up. Hundreds of HTTP requests
aren't fun, so we decided to support some sort of archive format.
Originally we were going for tar, but realized the ubiquity of Zip
(and that it also supports creating archives without compression!).

Everything for regular archives should be supported *except* encrypted files
and writing to the Zip-file.

Inflating can be slow. Use it if you have lots of text or other easily compressible media, otherwise avoid it.


Usage
---
Load the `jzsip.js` or `jzsip.min.js` before your code using ZIP
```
// Create ZIP instance
var myZip = new jzsip.Zip(data);
alert( myZip.getFile('textFile.txt') );

// `btoa()` is a native Base64 encoder. The following snippet will
// add an image to the page with source in `myZip://images/myImage.png`
var base64img = btoa( myZip.getFile('images/myImage.png') );
var imgElem = document.createElement('img');
imgElem.src = 'data:image/png;base64,'+ base64img;
document.body.appendChild(imgElem);
```
You can instantiate a Zip manually in an XHR:
```
var xhr = new XMLHttpRequest();
xhr.open('GET', 'myFiles.zip', true);
xhr.addEventListener('load', onZipLoad, true);
xhr.overrideMimeType('text/plain; charset=x-user-defined');
xhr.send();

function onZipLoad() {
	var myZip = new jzsip.Zip( xhr.responseText );
	alert( myZip.getFile('text.txt') );
}
```
However it gets messy if you need IE9 and IE10 support,
so jzsip provides a method to make it easy:
```
jzsip.loadZip('myFiles.zip', onZipLoad);
function onZipLoad(zip) {
	// `zip` is now a Zip instance.
	alert( zip.getFile('text.txt') );
};
```


For live demos, check the `test` folder.
Also hosted [here](http://dev.pj.gy/jzsip/test/).

Generating minified scripts
---
All fallback code is annotated. If you do not intend supporing IE9 and below, you can strip it out using this `sed` command:
```
sed '/@FALLBACK/d' jzsip.js | sed 's/\/\*@FALLBACK START.*@FALLBACK END\*\///' > minified/jzsip_nofallback.js
```
To minify a script, use:
```
// Minify jzsip.js -> minified/jzsip.min.js
uglifyjs --mangle --mangle-props --reserved-file uglify.js --comments --compress unsafe jzsip.js -o minified/jzsip.min.js

// Minify minified/jzsip_nofallback.js -> minified/jzsip_nofallback.min.js
uglifyjs --mangle --mangle-props --reserved-file uglify.js --comments --compress unsafe minified/jzsip_nofallback.js -o minified/jzsip_nofallback.min.js
```
Of course, `jzsip_nofallback.min.js` should provide the smallest filesize.
