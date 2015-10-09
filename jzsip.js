/**[JzSip 0.5a](https://github.com/frash23/jzsip) @License MIT */
/* Lines with "//@FALLBACK" or between / *@FALLBACK START/END* / can be omitted if you don't need the
 * single-threaded fallback for IE<=9, a script to do this can be found in the readme */ //@FALLBACK

(function () {
	"use strict";

	/* If you're loading JzSip dynamically, you may have to
	 * explicitly define what script to instantiate workers on */
	var SCRIPT_URL = '';

	/* IE10 doesn't support document.currentScript.src
	 * If you don't want to explicitly define the script URL
	 * using SCRIPT_URL, this will attempt grabbing the src
	 * attribute of the last <script> tag in the document at runtime */
	var UNSAFE_WORKER_SRC = true;

	/* DO NOT MODIFY BELOW UNLESS YOU KNOW WHAT YOU ARE DOING */

	/*@FALLBACK START*/
	var IE = navigator.userAgent.match(/MSIE [0-9]{1,2}/i);
	var IEVer = IE? Number(IE[0].substr(5)) : Infinity;
	/*@FALLBACK END*/

	var isThread = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
	var CALLSIZE = 25000; /*Used in readUTFBytes*/

	if(!isThread) window.JzSip = function Zip(url, callback) {
		var _url = document.createElement('a'); _url.href=url;
		url=_url.href; /* This converts `url` to an absolute path (Workers change base to root) */
		if(IEVer > 9) { //@FALLBACK
			var worker = new Worker(SCRIPT_URL);
			var wcnt = 0;
			var workerTask = function(cmd, data, cb) {
				var taskId = wcnt++; /*Task ID*/
				worker.postMessage( [cmd, taskId].concat(data) );
				worker.addEventListener('message', function _(e) { if(e.data[0] === taskId) cb(e.data[1]), worker.removeEventListener('message', _); });
			};
			workerTask('load', [url], function() {
				callback({
					getFile: function(name, cb, encoding) { workerTask('file', [name, encoding||'utf8'], cb); },
					getEntry: function(name, cb) { workerTask('entry', [name], function(json) { cb( JSON.parse(json) ); }); }
				})
			});
		/*@FALLBACK START*/
		} else loadZip(url, function(zip) {
			callback({
				getFile: function(name, cb, encoding) { cb(zip._getFile(name, encoding||'utf8')); },
				getEntry: function(name, cb) { cb( JSON.parse( zip._getEntry(name) ) ); }
			});
		});
		/*@FALLBACK END*/
	};

	if(!isThread/*@FALLBACK START*/ && IEVer>9/*@FALLBACK END*/) {
		if(document.currentScript) SCRIPT_URL = document.currentScript.src;
		else if(UNSAFE_WORKER_SRC && !SCRIPT_URL) { var tags=document.getElementsByTagName('script'),tag=tags[tags.length-1]; SCRIPT_URL = tag.getAttribute('src', 2); }
		else if(!SCRIPT_URL) throw 'Unable to get JzSip source script';
		return; /*We only want to continue if we're a worker*/
	}

	if(isThread && IEVer>9) { //@FALLBACK
		var zip;
		onmessage = function(e) {
			if(e.data.constructor !== Array) throw 'Worker onmessage: Data not Array';
			var cmd = e.data[0];
			var taskId = e.data[1]
			var data = e.data.slice(2);
			switch(cmd) {
				case 'load': loadZip(data[0], function(_zip) { zip = _zip; postMessage([taskId]); }); break;
				case 'file': postMessage([taskId, zip._getFile(data[0], data[1])]); break;
				case 'entry': postMessage([taskId, zip._getEntry(data[0])]); break;
			}
		};
	} //@FALLBACK

	function loadZip(url, cb) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.onreadystatechange = function() {
			if(xhr.readyState === 4 && xhr.status === 200) {
				var data = /*@FALLBACK START*/IEVer<10? new VBArray(xhr.responseBody).toArray() : /*@FALLBACK END*/new Uint8Array(xhr.response);
				cb( new ZipFile(data) );
			}
		};
		xhr.responseType = 'arraybuffer';
		xhr.send(null);
	}

	function subArr(arr, begin, end) {
		end = end === 'undefined'? arr.length : begin + end;
		return /*@FALLBACK START*/IEVer<10? arr.slice(begin, end) : /*@FALLBACK END*/arr.subarray(begin, end);
	}

	function readUTF(arr, len, offset) {
		offset = offset || 0;
		arr = subArr(arr, offset, len);
		var out = '';

		for(var i=0,l=Math.ceil(arr.length/CALLSIZE); i<l; i++) out += String.fromCharCode.apply(null, subArr(arr, i*CALLSIZE, i<l? CALLSIZE : arr.length%CALLSIZE));
		return out;
	}
	
	/*@FALLBACK START*/
	var b64char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');
	function arrToBase64(arr) {
		var len = arr.length;
		var output = '';
		var c; /*chunk*/

		for (var i=0,l=len-len%3; i <l; i++) {
			c = (arr[i] << 16) + (arr[++i] << 8) + (arr[++i]);
			output += b64char[c >> 18 & 0x3F] + b64char[c >> 12 & 0x3F] + b64char[c >> 6 & 0x3F] + b64char[c & 0x3F];
		}

		if(len%3 === 1) c = arr[arr.length - 1], output += b64char[c >> 2] + b64char[(c << 4) & 0x3F] + '==';
		else c = (arr[arr.length - 2] << 8) + (arr[arr.length - 1]), output += b64char[c >> 10] + b64char[(c >> 4) & 0x3F] + b64char[(c << 2) & 0x3F] + '=';

		return output;
	};
	/*@FALLBACK END*/

	function readUInt(arr, i) { return (arr[i+3] << 24) | (arr[i+2] << 16) | (arr[i+1] << 8) | arr[i]; }
	function readUShort(arr, i) { return ((arr[i+1]) << 8) | arr[i]; }

	function ZipEntry(name) { this.name = name; }
	ZipEntry.prototype = {
		read_raw: function() {
			if(this.data) return this.data;
			var fileData = subArr(this.zip.data, this.dataStart, this.compressedSize);	

			switch(this.method) {
				case 0: /* STORED */
					this.data = fileData;
					return fileData;

				case 8: /* DEFLATED */			
				defalt: throw 'ZipEntry#read_raw: Invalid compression method';
			}
		},
		read_utf8: function() {
			if(this.dataUTF8) return this.dataUTF8;
			var data = this.read_raw();
			return (this.dataUTF8 = readUTF(data, data.length));
		},
		read_base64: function() {
			if(this.dataBase64) return this.dataBase64;
			var b64 = /*@FALLBACK START*/IEVer <= 9? arrToBase64( this.read_raw() ) : /*@FALLBACK END*/btoa( this.read_utf8() );
			return (this.dataBase64 = b64);
		}
	};

	function ZipFile(data) {
		this.data = data;
		this.entryTable = {};

		var i = data.length - 21; /*22=END Header size, 1 offset to make loop functional*/
		var n = Math.max(0, i - 0xFFFF); /*0xFFFF=Max zip comment length*/
		var zipEnd;
		while(i-- >= n) if(readUInt(data, i) === 0x06054B50) zipEnd = i;
		if(!zipEnd) throw 'Parsing header: File ended abrubtly, invalid zip';

		var head = subArr(data, zipEnd, 22);
		var entryAmount = readUShort(head, 10);
		/* Process entries */
		var offset = readUInt(head, 0x10); /*0x10=Offset of first CEN header*/
		for(var i=0; i<entryAmount; i++) {
			var tmpdata = subArr(data, offset, 0x2E); /*VERIFY HEADER | 0x2E=Cen header size*/
			offset += 46;
			if( readUInt(tmpdata, 0x0) !== 0x02014B50 ) throw 'Reading entries: Bad CEN signature'; /*0x02014B50=CEN signature/"PK\001\002"*/
			var len = readUShort(tmpdata, 0x1C); /*NAME | 0x1C=Name size*/
			if(len === 0) throw 'Read entries: Entry missing name';
			var entry = new ZipEntry( readUTF(data, len, offset) ); 
			offset += len;
			entry.isDirectory = entry.name.charAt(entry.name.length-1) === '/'? true : false;
			len = readUShort(tmpdata, 0x1E); /*EXTRA FIELD | 0x1E=Extra field size*/
			if(len > 0) entry.extra = readUTF(data, len, offset);
			offset += len;
			len = readUShort(tmpdata, 0x20); /*COMMENT | 0x20=Comment field size*/
			entry.comment = readUTF(data, len, offset);
			offset += len;
			entry.version = readUShort(tmpdata, 0x06); /*VERSION*/
			entry.flag = readUShort(tmpdata, 0x08); /*FLAG*/
			if( (entry.flag & 1) === 1 ) throw 'read entries: Encrypted ZIP entry not supported';
			entry.method = readUShort(tmpdata, 0x0A); /*COMPRESSION METHOD*/
			entry.dostime = readUInt(tmpdata, 0x0C); /*DOSTIME*/
			entry.crc = readUInt(tmpdata, 0x10); /*CRC*/
			entry.compressedSize = readUInt(tmpdata, 0x14); /*COMPRESSED SIZE*/
			entry.size = readUInt(tmpdata, 0x18); /*UNCOMPRESSED SIZE*/
			entry.locOffset = readUInt(tmpdata, 0x2A);
			entry.zip = this; entry.data = null; entry.dataUTF8 = null; entry.dataBase64 = null;
			entry.dataStart = entry.locOffset+30 + entry.name.length + ((this.data[entry.locOffset+29] << 8) | this.data[entry.locOffset+28])/*30=End of LOC header, Bitshift=Read short*/;

			this.entryTable[entry.name] = entry; /*Add to entry map*/
		}
	}
	
	/* Due to limitations in web workers, we stringify entries, as such we
	 * need to strip out circular and massive(unneeded) data */
	var jsonBlacklist = ['zip','data','dataUTF8','dataBase64'];
	var jsonReplacer = function(k,v) { return jsonBlacklist.indexOf(k)>-1? undefined : v };
	ZipFile.prototype = {
		_getFile: function(name, enc) { enc=enc.replace(/\W/g,'').toLowerCase(); return this.entryTable[name]['read_'+ enc](); },
		_getEntry: function(name) { return JSON.stringify(this.entryTable[name], jsonReplacer, null); }
	};
}());
