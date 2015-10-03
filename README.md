# jzsip
5KB read-only ZIP implementation in browser-sideJavaScript. Supports compression.
![Yes, it's 5KB after gzip -6](https://raw.githubusercontent.com/frash23/jzsip/master/5kb_after_gzip.png)

Why?
---
This was made for a project where end-developers are supposed to easily create a bundle of media for their project and load it up. Having shy of a few hundred HTTP requests isn't really fun, so we decided to support some form of archive format. Originally we were going for tar, but realized the ubiquity of zip (and that it also supports creating archives without compression!).

Inflating can be slow. Use it if you have lots of text or other easily compressible media, otherwise avoid it.


Usage
---
Load the `jzsip.js` or `jzsip.min.js` before your code using ZIP
```
// Create ZIP instance
var myZip = new jzsip.Zip(data);
alert( myZip.getFile('textFile.txt') );

// `btoa()` is a native Base64 decoder. The following code will create
// an <img> element and put it in the <body> of the document.
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
However it gets messy if you need IE9 support.
Luckily jzsip provides a method to make it easy:
```
jzsip.loadZip('myFiles.zip', onZipLoad);
function onZipLoad(zip) {
	// `zip` is now a Zip instance.
	alert( zip.getFile('text.txt') );
};
```


For live demos, check the `test` folder.
Also hosted [here](about:blank). (TODO: Add hosted example)
