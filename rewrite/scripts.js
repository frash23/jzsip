/*
 * JzSip 0.5a by Jacob Pedersen
 * Licensed MIT
 *
 * Lines with "// @FALLBACK" or between /* @FALLBACK START/END * / can safely
 * be omitted if you do not intend using the single-threaded fallback for IE<=9
 */

(function () {
	"use strict";

	/* If you're loading JzSip dynamically, you may have to
	 * explicitly define what script to instantiate workers on */
	var SCRIPT_URL = 'scripts.js';

	/* IE10 doesn't support document.currentScript.src
	 * If you don't want to explicitly define the script URL
	 * using SCRIPT_URL, this will attempt grabbing the src
	 * attribute of the last <script> tag in the document at runtime */
	var UNSAFE_WORKER_SRC = false;

	/* DO NOT MODIFY BELOW UNLESS YOU KNOW WHAT YOU ARE DOING */

	var isIE = false, ieVer;
	var isThread = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;

	var IE = navigator.userAgent.match(/MSIE [0-9]{1,2}/i);
	var IEVer = IE? Number(IE[0].substr(5)) : Infinity;

	var USE_WORKERS = true && IEVer > 9; /*Workers don't work on IE*/ // @FALLBACK
	var CALLSIZE = 25000; /*Used in readUTFBytes*/

	/* Non-Worker code START */
	if(!isThread) window.JzSip = function Zip(url, callback) {
		if(USE_WORKERS) { // @FALLBACK
			var worker = new Worker(SCRIPT_URL);
			var wcnt = 0;
			var workerTask = function(cmd, data, cb) {
				wcnt++; /*Task ID*/
				worker.postMessage( [cmd, wcnt].concat(data) );
				worker.addEventListener('message', function _(e) { if(e.data[0] === wcnt) cb(e.data[1]), worker.removeEventListener('message', _); });
			};
			workerTask('loadZip', [url], function() {
				callback({
					getFile: function(name, cb, encoding) { workerTask('getFile', [name, encoding||'utf8'], cb); },
					getEntry: function(name, cb) { workerTask('getEntry', [name], function(json) { cb( JSON.parse(json) ); }); },
					isWorker: true
				})
			});
		/* @FALLBACK START */
		} else loadZip(url, function(zip) {
			callback({
				getFile: function(name, cb, encoding) { cb(zip.getFile(name, encoding||'utf8')); },
				getEntry: function(name, cb) { cb( JSON.parse( zip.getEntry(name) ) ); },
				isWorker: false
			});
		});
		/* @FALLBACK END */
	};

	if(!isThread/*@FALLBACK START*/ && USE_WORKERS/*@FALLBACK END*/) return SCRIPT_URL = document.currentScript? document.currentScript.src : SCRIPT_URL || (function(){var tags=document.getElementsByTagName('script'),tag=tags[tags.length-1];return tag.getAttribute('src', 2); })();
	/* Non-Worker code END */

	/* Worker code START */
	if(isThread && USE_WORKERS) { // @FALLBACK
		var zip;
		onmessage = function(e) {
			if(e.data.constructor !== Array) throw 'Worker onmessage: Data not Array';
			var cmd = e.data[0];
			var taskId = e.data[1]
			var data = e.data.slice(2);
			switch(cmd) {
				case 'loadZip': loadZip(data[0], function(_zip) { zip = _zip; postMessage([taskId]); }); break;
				case 'getFile': postMessage([taskId, zip.getFile(data[0], data[1])]); break;
				case 'getEntry': postMessage([taskId, zip.getEntry(data[0])]); break;
			}
		};
	} // @FALLBACK
	/* Worker code END */

	function loadZip(url, cb) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.addEventListener('load', function() {
			var data = IEVer>10? new Uint8Array(xhr.response) : new VBArray(xhr.responseBody).toArray();
			cb( new ZipFile(data) );
		}, false);
		if(xhr.overrideMimeType) xhr.responseType = 'arraybuffer';
		else xhr.setRequestHeader('Accept-Charset', 'x-user-defined');
		xhr.send(null);
	}

	function subArr(arr, begin, end) {
		end = end === 'undefined'? arr.length : begin + end;
		return IEVer>10? arr.subarray(begin, end) : arr.slice(begin, end);
	}

	function readUTF(arr, len, offset) {
		offset = offset || 0;
		arr = subArr(arr, offset, len);
		var out = '';

		for(var i=0,l=Math.ceil(arr.length/CALLSIZE); i<l; i++) out += String.fromCharCode.apply(null, subArr(arr, i*CALLSIZE, i<l? CALLSIZE : arr.length%CALLSIZE));
		return out;
	}
	
	/* @FALLBACK START */
	var b64char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');
	function arrToBase64(arr) {
		var len = arr.length;
		var output = '';
		var c; /*chunk*/

		for (var i=0,l=len-len%3; i <l; i++) {
			c = (arr[i] << 16) + (arr[++i] << 8) + (arr[++i])
			output += b64char[c >> 18 & 0x3F] + b64char[c >> 12 & 0x3F] + b64char[c >> 6 & 0x3F] + b64char[c & 0x3F];
		}

		if(len%3 === 1) c = arr[arr.length - 1], output += b64char[c >> 2] + b64char[(c << 4) & 0x3F] + '==';
		else c = (arr[arr.length - 2] << 8) + (arr[arr.length - 1]), output += b64char[c >> 10] + b64char[(c >> 4) & 0x3F] + b64char[(c << 2) & 0x3F] + '=';

		return output
	};
	/* @FALLBACK END */

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
				break;

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
			var b64 = /*@FALLBACK STAR*/IEVer <= 9? arrToBase64( this.read_raw() ) : /*@FALLBACK END*/btoa( this.read_utf8() );
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
		getFile: function(name, enc) { enc=enc.replace(/\W/g,'').toLowerCase(); return this.entryTable[name]['read_'+ enc](); },
		getEntry: function(name) { return JSON.stringify(this.entryTable[name], jsonReplacer, null); },
		getEntries: function() { var entries = []; for(var e in this.entryTable) entries.push(this.entryTable[e]); return entries; }
	};
}());
