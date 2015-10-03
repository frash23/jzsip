"use strict";

/*! Not finished - will be changed around */
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
		var data = !isIE? xhr.responseText : BinaryToArray(xhr.responseBody).toArray();
		var zip = new ZipFile(data);
		cb(zip);
	}, false);

	if(xhr.overrideMimeType) {
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
	} else {
		var vbScript = `
			<script type="text/vbscript">
				<!--
				Function BinaryToArray(Binary)
				  Dim i
				  ReDim byteArray(LenB(Binary))
				  For i = 1 To LenB(Binary)
					 byteArray(i-1) = AscB(MidB(Binary, i, 1))
				  Next
				  BinaryToArray = byteArray
				End Function
				-->
			</script>`;
		document.write(vbScript); /* It's okay to use cancerous code if it's only executed on cancerous browsers, right? */
		xhr.setRequestHeader('Accept-Charset', 'x-user-defined');
		isIE = true;
	}

	xhr.send();
}
