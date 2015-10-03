"use strict";

import { ZipEntry } from './ZipEntry.js';
import { ZipFile } from './ZipFile.js';

window.jzsip = window.jzsip || {
	Zip: ZipFile,
	loadZip: loadZip
};

function loadZip(url, cb) {
	var isIE = false;

	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.addEventListener('load', function() {
		var data = !isIE? xhr.responseText : BinArr(xhr.responseBody).toArray();
		var zip = new ZipFile(data);
		cb(zip);
	}, false);

	if(xhr.overrideMimeType) {
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
	} else {
		/* 690865979..toString(30) === 'script'. If you inline the script in HTML, it'd break if the script tags where in plain text */
		var vbScript = '<'+690865979..toString(30)+' type="text/vbscript"><!--\nFunction BinArr(Bin)Dim i:ReDim byteArray(LenB(Bin)):For i=1 To LenB(Bin):byteArray(i-1)=AscB(MidB(Bin,i,1)):Next:BinArr=byteArray End Function\n--></'+690865979..toString(30)+'>';
		document.write(vbScript); /* It's okay to use cancerous code if it's only executed on cancerous browsers, right? */
		xhr.setRequestHeader('Accept-Charset', 'x-user-defined');
		isIE = true;
	}

	xhr.send();
}
