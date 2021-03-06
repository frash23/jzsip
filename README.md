# JzSip
Tiny & fast library for reading ZIP files in your browser with multi-threading (IE10+). 
Supports IE9. IE8 isn't hard to implement, but notoriously slow.
![Yes, it's >3KB after gzip](https://raw.githubusercontent.com/frash23/jzsip/master/filesize.png)

Why?
---
This was made for a project where end-developers are supposed to easily create
a bundle of assets for their project, so we needed to support an archive format.

Everything for regular archives should be supported *except* encrypted files
and writing to the Zip-file.

Inflating is slow. Use it if you have lots of text or other easily compressible media, otherwise avoid it.
Please **DO NOT** use compression on files larger than 6-10MB unless you really know what you are doing.
It is notoriously slow on IE9 (5-10 seconds) and noticeably slow on modern browsers as well (1-3 seconds).


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
The `zip` variable passed to the `JzSip` callback is an object literal with the following properties:
* `getFile(fileName, callback[, encoding="utf8"])`: Reads data from a file.
Default encoding is `"utf8"` (text/string), you can also use `"raw" -> Uint8Array|Array`
and `"base64" -> Base64 String`, which includes a fast `Array[Byte]`->`Base64 String` function for IE9
* `getEntry(fileName, callback)` Passes a JSON Object with the following metadata:
	* `name` - Filename of the entry
	* `isDirectory` - Boolean describing if the entry is a folder or file
	* `method` - Compress algorithm used. JzSip supports `0` (uncompressed) and `8` (deflated)
	* `size` - The filesize of the entry in bytes
	* `timestamp` - UNIX timestamp of when the entry was last modified

**To load multiple files:** Simply pass an array of filenames instead of a single string, like so:
```
zip.getFile(['test.txt', 'images/otherfile.bmp'], function(files) {
	console.log( files['test.txt'] ); /* Will log the contents of `test.txt` */
	console.log( files['images/otherfile.bmp'] );
});
```
JzSip#getEntry has the same behavior.

For live demos, check the `test` folder.
Also hosted [here](http://dev.pj.gy/jzsip/test/).

