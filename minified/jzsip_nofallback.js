/**[JzSip 0.5a](https://github.com/frash23/jzsip) @License MIT */

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

	var isThread = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
	var CALLSIZE = 25000; /*Used in readUTFBytes*/

	if(!isThread) window.JzSip = function Zip(url, callback) {
		var _url = document.createElement('a'); _url.href=url;
		url=_url.href; /* This converts `url` to an absolute path (Workers change base to root) */
			var worker = new Worker(SCRIPT_URL);
			var wcnt = 0;
			var workerTask = function(cmd, data, cb) {
				var taskId = wcnt++; /*Task ID*/
				worker.postMessage( [cmd, taskId, data] );
				worker.addEventListener('message', function _(e) { if(e.data[0] === taskId) cb(e.data[1]), worker.removeEventListener('message', _); });
			};
			workerTask('load', url, function() {
				callback({
					getFile: function(name, cb, encoding) { workerTask('file', [name, encoding], cb); },
					getEntry: function(name, cb) { workerTask('entry', name, function(json) { cb( JSON.parse(json) ); }); }
				})
			});
		
	};

	if(!isThread) {
		if(document.currentScript) SCRIPT_URL = document.currentScript.src;
		else if(UNSAFE_WORKER_SRC && !SCRIPT_URL) { var tags=document.getElementsByTagName('script'),tag=tags[tags.length-1]; SCRIPT_URL = tag.getAttribute('src', 2); }
		else if(!SCRIPT_URL) throw "Couldn't get JzSip script";
		return; /*We only want to continue if we're a worker*/
	}

		var zip;
		onmessage = function(e) {
			switch(e.data[0]) { /* e.data[0]=cmd, e.data[1]=TaskID, e.data[2]=cmd data */
				case 'load': loadZip(e.data[2], function(_zip) { zip = _zip; postMessage([e.data[1]]); }); break;
				case 'file': postMessage([e.data[1], zip._getFile(e.data[2][0], e.data[2][1])]); break;
				case 'entry': postMessage([e.data[1], zip._getEntry(e.data[2])]); break;
			}
		};

	function loadZip(url, cb) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.onload = function() {
			var data = new Uint8Array(xhr.response);
			cb( new ZipFile(data) );
			xhr = null;
		};
		xhr.responseType = 'arraybuffer';
		xhr.send(null);
	}

	function subArr(arr, begin, end) {
		end = end === 'undefined'? arr.length : begin + end;
		return arr.subarray(begin, end);
	}

	function readUTF(arr, len, offset) {
		offset = offset || 0;
		arr = subArr(arr, offset, len);
		var out = '';
		for(var i=0,l=arr.length; i<l; i+=CALLSIZE) out += String.fromCharCode.apply(null, subArr(arr, i, CALLSIZE));
		return out;
	}
	
	

	function readUInt(arr, i) { return (arr[i+3] << 24) | (arr[i+2] << 16) | (arr[i+1] << 8) | arr[i]; }
	function readUShort(arr, i) { return ((arr[i+1]) << 8) | arr[i]; }

	function ZipEntry(name) { this._name = name; }
	ZipEntry.prototype.read = function(encoding) {
		encoding = encoding || '';
		switch( encoding.toLowerCase() ) {
		case 'raw':
			if(this.data) return this.data;
			var fileData = subArr(this.zip.data, this.dataStart, this.compressedSize);	
			if(this._method === 0/*STORED*/) { this.data = fileData; return fileData; }
			else if(this._method === 8/*DEFLATED*/) return (this.data = inflate(fileData, this._size));
			else throw 'ZipEntry: Invalid compression method';

		case 'base64':
			if(this.dataBase64) return this.dataBase64;
			var b64 = btoa( this.read() );
			return (this.dataBase64 = b64);

		case 'utf8': case 'utf-8': default:
			if(this.dataUTF8) return this.dataUTF8;
			var data = this.read('raw');
			return (this.dataUTF8 = readUTF(data, data.length));
		}
	};

	function ZipFile(data) {
		this.data = data;
		this.entryTable = {};

		var i = data.length - 21; /*22=END Header size, 1 offset to make loop functional*/
		var n = Math.max(0, i - 0xFFFF); /*0xFFFF=Max zip comment length*/
		var zipEnd;
		while(i-- >= n) if(readUInt(data, i) === 0x06054B50) zipEnd = i;
		if(!zipEnd) throw 'ZipFile: File ended abrubtly, invalid zip';

		var head = subArr(data, zipEnd, 22);
		var entryAmount = readUShort(head, 10);
		/* Process entries */
		var offset = readUInt(head, 0x10); /*0x10=Offset of first CEN header*/
		for(var i=0; i<entryAmount; i++) {
			var tmpdata = subArr(data, offset, 0x2E); offset += 46; /*VERIFY HEADER | 0x2E=Cen header size*/
			if( readUInt(tmpdata, 0x0) !== 0x02014B50 ) throw 'ZipFile: Bad CEN signature'; /*0x02014B50=CEN signature/"PK\001\002"*/
			var len = readUShort(tmpdata, 0x1C); /*NAME | 0x1C=Name size*/
			if(len === 0) throw 'ZipFile: Entry missing name';
			var entry = new ZipEntry( readUTF(data, len, offset) );  offset += len;
			entry._isDirectory = entry._name.charAt(entry._name.length-1) === '/'? true : false;
			len = readUShort(tmpdata, 0x1E); /*EXTRA FIELD | 0x1E=Extra field size*/
			if(len > 0) entry.extra = subArr(data, offset, len); offset += len;
			len = readUShort(tmpdata, 0x20); /*COMMENT | 0x20=Comment field size*/
			entry._comment = readUTF(data, len, offset); offset += len;
			entry.version = readUShort(tmpdata, 0x06); /*VERSION*/
			entry.flag = readUShort(tmpdata, 0x08); /*FLAG*/
			if( (entry.flag & 1) === 1 ) throw 'ZipFile: Encrypted entries not supported';
			entry._method = readUShort(tmpdata, 0x0A); /*COMPRESSION METHOD*/
			var dostime = readUInt(tmpdata, 0x0C); /*DOSTIME*/
			entry._timestamp= new Date(/*Year  */((dostime >> 25) & 0x7F) + 1980,
												/*Month */((dostime >> 21) & 0x0F) - 1,
												/*Day   */ (dostime >> 16) & 0x1F,
												/*Hour  */ (dostime >> 11) & 0x1F,
												/*Minute*/ (dostime >> 5) & 0x3F,
												/*Second*/ (dostime & 0x1F) << 1).getTime();
			entry.crc = readUInt(tmpdata, 0x10); /*CRC*/
			entry.compressedSize = readUInt(tmpdata, 0x14); /*COMPRESSED SIZE*/
			entry._size = readUInt(tmpdata, 0x18); /*UNCOMPRESSED SIZE*/
			entry.locOffset = readUInt(tmpdata, 0x2A);
			entry.zip = this; entry.data = null; entry.dataUTF8 = null; entry.dataBase64 = null;
			entry.dataStart = entry.locOffset+30 + entry._name.length + ((this.data[entry.locOffset+29] << 8) | this.data[entry.locOffset+28])/*30=End of LOC header, Bitshift=Read short*/;

			this.entryTable[entry._name] = entry; /*Add to entry map*/
		}
	}
	ZipFile.prototype = {
		_getFile: function(name, enc) { return this.entryTable[name].read(enc); },
		_getEntry: function(name) {
			var entry = this.entryTable[name];
			return JSON.stringify({
				name: entry._name,
				isDirectory: entry._isDirectory,
				timestamp: entry._timestamp,
				size: entry._size,
				comment: entry._comment,
				method: entry._method
			});
		}
	};

	/* Inflater | If you don't need inflation, you can omit everything below except the last line (`}());`) */
	function inflate(arr, finalLen) {
		var LENS =  [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
		var LEXT =  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
		var DISTS = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
		var DEXT =  [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
		var DYNAMIC_TABLE_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
		var distcode, lencode, symbol, ncode, ndist, dist, last, type, lens, nlen, err1, err2, len, i;
		var inbuf = arr;
		var buflen = arr.length; /*The amount of bytes to read*/
		var finalLen = finalLen; /*Uncompressed size as it shows up in the ZipEntry*/
		var incnt = 0; /*Amount of bytes read*/
		var outcnt = 0; /*Bytes written to outbuf*/
		var bitcnt = 0; /*Helper to keep track of where we are in #bits*/
		var bitbuf = 0;
		var outbuf = new Uint8Array(finalLen);

		/* Helper functions */
		var bits = function(need) {
			var out = bitbuf;
			while(bitcnt < need) {
				if(incnt === buflen) throw 'inflate: Data overflow';
				out |= inbuf[incnt++] << bitcnt;
				bitcnt += 8;
			}
			bitbuf = out >> need;
			bitcnt -= need;
			return out & ((1 << need) - 1);
		};
		var decode = function(codes) {
			var code = 0, first = 0, i = 0, count;
			for(var j=1; j <= 0xF; j++) {
				code |= bits(1);
				count = codes.count[j];
				if(code < first + count) return codes.symbol[i + (code-first)];
				i += count; first += count; first <<= 1; code <<= 1;
			}
		};
		var construct = function(codes, lens, n) {
			var offs = [/*undefined*/, 0], left = 1;
			for(var i=0; i<=0xF; i++) codes.count[i] = 0;
			for(i=0; i<n; i++) codes.count[lens[i]]++;
			if(codes.count[0] === n) return 0;
			for(i=1; i<=0xF; i++) if((left = (left<<1) - codes.count[i]) < 0) return left;
			for(i=1; i< 0xF; i++) offs[i+1] = offs[i] + codes.count[i];
			for(i=0; i<n; i++) if(lens[i] !== 0) codes.symbol[offs[lens[i]]++] = i;
			return left;
		};

		do { /* The actual inflation */
			last = bits(1);
			type = bits(2);

			switch(type) {
				case 0: /* STORED */
					bitbuf = bitcnt = 0;
					if(incnt+4 > buflen) throw 'inflate: Data overflow';
					len = inbuf[incnt++];
					len |= inbuf[incnt++] << 8;
					if(inbuf[incnt++] !== (~len & 0xFF) || inbuf[incnt++] !== ((~len >> 8) & 0xFF)) throw 'Inflater: Bad length';
					if(incnt + len > buflen) throw 'Inflater: Data overflow';
					while(len--) outbuf[outcnt++] = inbuf[incnt++];
				break;
				case 1: case 2: /* FIXED|DYNAMIC HUFFMAN */
					lencode = {count:[], symbol:[]};
					distcode = {count:[], symbol:[]};
					lens = [];
					if(type === 1) { /* Construct fixed huffman tables */
						/*UNTESTED*/
						for(symbol=0; symbol < 0x90; symbol++) lens[symbol] = 8;
						for(; symbol < 0x100; symbol++) lens[symbol] = 9;
						for(; symbol < 0x118; symbol++) lens[symbol] = 7;
						for(; symbol < 0x120; symbol++) lens[symbol] = 8;
						construct(lencode, lens, 0x120);
						for(symbol=0; symbol < 0x1E; symbol++) lens[symbol] = 5;
						construct(distcode, lens, 0x1E);
					} else { /* Construct dynamic huffman tables */
						nlen = bits(5) + 257;
						ndist = bits(5) + 1;
						ncode = bits(4) + 4;
						if(nlen > 0x11E || ndist > 0x1E) throw 'inflate: Length/distance code overflow';
						for(i=0; i<ncode; i++) lens[DYNAMIC_TABLE_ORDER[i]] = bits(3);
						for(; i<19; i++) lens[DYNAMIC_TABLE_ORDER[i]] = 0;
						if( construct(lencode, lens, 19) !== 0 ) throw 'inflate: Length codes incomplete';

						for(i=0; i < nlen+ndist;) {
							symbol = decode(lencode);
							if(symbol < 16) lens[i++] = symbol;
							else {
								len = 0;
								if(symbol === 16) {
									if(i === 0) throw 'inflate: Repeat lengths with no first length';
									len = lens[i-1];
									symbol = 3 + bits(2);
								} else if(symbol === 17) symbol = 3 + bits(3);
								else symbol = 11 + bits(7);
								if(i + symbol > nlen + ndist) throw 'inflite: More lengths than specified';
								while(symbol--) lens[i++] = len;
							}
						}
						err1 = construct(lencode, lens, nlen);
						err2 = construct(distcode, lens.slice(nlen), ndist);
						if( (err1<0 || (err1>0 && nlen - lencode.count [0] !== 1) )
						||  (err2<0 || (err2>0 && ndist- distcode.count[0] !== 1))) throw 'inflate: Bad literal/length length codes';
					}

					do { /* Decode deflated data */
						symbol = decode(lencode);
						if(symbol < 256) outbuf[outcnt++] = symbol;
						if(symbol > 256) {
							symbol -= 257;
							if(symbol > 28) throw 'inflate: Invalid length/distance';
							len = LENS[symbol] + bits(LEXT[symbol]);
							symbol = decode(distcode);
							dist = DISTS[symbol] + bits(DEXT[symbol]);
							if(dist > outcnt) throw 'inflate: Distance out of range';
							while(len--) outbuf[outcnt] = outbuf[outcnt++ - dist];
						}
					} while(symbol !== 256);
				break;
				default: throw 'Inflater: Unsupported compression type '+type;
			}
		} while(!last);
		return outbuf;
	} /* If you're removing inflater(), remember to keep the line below */
}());
