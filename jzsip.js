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

	var USE_VBARRAY = typeof Uint8Array === 'undefined';
	var isThread = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
	var CALLSIZE = 25000; /*Used in readUTFBytes*/

	if(!isThread) window.JzSip = function Zip(url, callback) {
		var _url = document.createElement('a'); _url.href=url;
		url=_url.href; /* This converts `url` to an absolute path (Workers change base to root) */
		if(window.Worker) { //@FALLBACK
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
		/*@FALLBACK START*/
		} else loadZip(url, function(zip) {
			callback({
				getFile: function(name, cb, encoding) { cb(zip._getFile(name, encoding)); },
				getEntry: function(name, cb) { cb( JSON.parse( zip._getEntry(name) ) ); }
			});
		});
		/*@FALLBACK END*/
	};

	if(!isThread/*@FALLBACK START*/ && window.Worker/*@FALLBACK END*/) {
		if(document.currentScript) SCRIPT_URL = document.currentScript.src;
		else if(UNSAFE_WORKER_SRC && !SCRIPT_URL) { var tags=document.getElementsByTagName('script'),tag=tags[tags.length-1]; SCRIPT_URL = tag.getAttribute('src', 2); }
		else if(!SCRIPT_URL) throw "Couldn't get JzSip script";
		return; /*We only want to continue if we're a worker*/
	}

	if(isThread) { //@FALLBACK
		var zip;
		onmessage = function(e) {
			var taskId = e.data[1]
			var data = e.data.slice(2);
			switch(e.data[0]) {
				case 'load': loadZip(data[2], function(_zip) { zip = _zip; postMessage([taskId]); }); break;
				case 'file': postMessage([taskId, zip._getFile(e.data[2][0], e.data[2][1])]); break;
				case 'entry': postMessage([taskId, zip._getEntry(e.data[2])]); break;
			}
		};
	} //@FALLBACK

	function loadZip(url, cb) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.onreadystatechange = function() {
			if(xhr.readyState === 4 && xhr.status === 200) {
				var data = /*@FALLBACK START*/USE_VBARRAY? new VBArray(xhr.responseBody).toArray() : /*@FALLBACK END*/new Uint8Array(xhr.response);
				cb( new ZipFile(data) );
			}
		};
		xhr.responseType = 'arraybuffer';
		xhr.send(null);
	}

	function subArr(arr, begin, end) {
		end = end === 'undefined'? arr.length : begin + end;
		return /*@FALLBACK START*/arr.slice? arr.slice(begin, end) : /*@FALLBACK END*/arr.subarray(begin, end);
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

	function ZipEntry(name) { this._name = name; }
	ZipEntry.prototype.read = function(encoding) {
		encoding = encoding || '';
		switch( encoding.toLowerCase() ) {
		case 'raw':
			if(this.data) return this.data;
			var fileData = subArr(zip.data, this.dataStart, this.compressedSize);	

			if(this._method === 0/*STORED*/) { this.data = fileData; return fileData; }
			else if(this._method === 8/*DEFLATED*/) {
				var inflater = new Inflater(fileData, this._size)
				this.data = inflater.inflate();
				inflater = null;
				return this.data;
			} else throw 'ZipEntry#read_raw: Invalid compression method';

		case 'base64':
			if(this.dataBase64) return this.dataBase64;
			var b64 = /*@FALLBACK START*/typeof btoa === 'undefined'? arrToBase64( this.read('raw') ) : /*@FALLBACK END*/btoa( this.read() );
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
			entry._isDirectory = entry._name.charAt(entry._name.length-1) === '/'? true : false;
			len = readUShort(tmpdata, 0x1E); /*EXTRA FIELD | 0x1E=Extra field size*/
			if(len > 0) entry.extra = subArr(data, offset, len);
			offset += len;
			len = readUShort(tmpdata, 0x20); /*COMMENT | 0x20=Comment field size*/
			entry._comment = readUTF(data, len, offset);
			offset += len;
			entry.version = readUShort(tmpdata, 0x06); /*VERSION*/
			entry.flag = readUShort(tmpdata, 0x08); /*FLAG*/
			if( (entry.flag & 1) === 1 ) throw 'read entries: Encrypted ZIP entry not supported';
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

	/* The deflation method in all its glory */
	function Inflater(arr, finalLen) {
		this.inbuf = arr;
		this.len = arr.length; /*The amount of bytes to read*/
		this.finalLen = finalLen; /*Uncompressed size as it shows up in the ZipEntry*/
		this.outbuf = USE_VBARRAY? [] : new Uint8Array(finalLen);
	}
	Inflater.LENS =  [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
	Inflater.LEXT =  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
	Inflater.DISTS = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
	Inflater.DEXT =  [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
	Inflater.DYNAMIC_TABLE_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
	Inflater.prototype = {
		incnt: 0, /*Amount of bytes read*/
		outcnt: 0, /*Bytes written to this.outbuf*/
		bitcnt: 0, /*Helper to keep track of where we are in #bits*/
		/* Huffman tables */

		bits: function(need) {
			var out = this.bitbuf;
			while(this.bitcnt < need) {
				if(this.incnt === this.len) throw 'Inflater#bits: Available data did not terminate ';
				out |= this.inbuf[this.incnt++] << this.bitcnt;
				this.bitcnt += 8;
			}
			this.bitbuf = out >> need;
			this.bitcnt -= need;
			return out & ((1 << need) - 1);
		},

		decode: function(codes) {
			var code = 0, first = 0, i = 0, count;
			for(var j=1; j <= 0xF; j++) {
				code |= this.bits(1);
				count = codes.count[j];
				if(code < first + count) return codes.symbol[i + (code-first)];
				i += count;
				first += count;
				first <<= 1;
				code <<= 1;
			}
			return -9;
		},

		stored: function() {
			this.bitbuf = this.bitcnt = 0;
			if(this.incnt+4 > this.len) throw 'Inflater#stored: Available data did not terminate';
			var len = this.inbuf[this.incnt++];
			len |= this.inbuf[this.incnt++] << 8;
			if(this.inbuf[this.incnt++] !== (~len & 0xFF)
			|| this.inbuf[this.incnt++] !== ((~len >> 8) & 0xFF)) throw 'Inflater#stored: Stored block length did not match actual length';
			if(this.incnt + len > this.len) throw 'Inflater#stored: Data overflow';
			if(USE_VBARRAY) this.outbuf = this.outbuf.concat( subArr(this.inbuf, this.incnt) );
			else this.outbuf.set( subArr(this.inbuf, this.incnt), len );
			this.outcnt += len; this.incnt += len;
		},

		codes: function() {
			var symbol, len, dist;
			do {
				symbol = this.decode(this.lencode);
				if(symbol < 0) return symbol;
				if(symbol < 256) this.outbuf[this.outcnt++] = symbol;
				if(symbol > 256) {
					symbol -= 257;
					if(symbol > 28) throw 'Inflater#codes: Invalid length or distance';
					len = Inflater.LENS[symbol] + this.bits(Inflater.LEXT[symbol]);
					symbol = this.decode(this.distcode);
					if(symbol < 0) return symbol;
					var dist = Inflater.DISTS[symbol] + this.bits(Inflater.DEXT[symbol]);
					if(dist > this.outcnt) throw 'Inflater#codes: Distance out of range';
					while(len--) this.outbuf[this.outcnt] = this.outbuf[this.outcnt++ - dist];
					if(symbol === 256) throw 'aaa';
				}
			} while(symbol !== 256);

			return 0;
		},

		construct: function(codes, lens, n) {
			var offs = [undefined, 0];
			var left = 1;
			for(var i=0; i<=0xF; i++) codes.count[i] = 0;
			for(i=0; i<n; i++) codes.count[lens[i]]++;
			if(codes.count[0] === n) return 0;
			for(i=1; i<=0xF; i++) {
				left <<= 1;
				left -= codes.count[i];
				if(left < 0) return left;
			}
			for(i=1; i< 0xF; i++) offs[i+1] = offs[i] + codes.count[i];
			for(i=0; i<n; i++) if(lens[i] !== 0) codes.symbol[offs[lens[i]]++] = i;
			return left;
		},

		constructTables: function(type) {
			var lens = [];
			
			if(type === 1) { /*Fixed tables*/
				if(console && console.warn) console.warn('Here lies untested code');
				for(var symbol=0; symbol < 0x90; symbol++) lens[symbol] = 8;
				for(; symbol < 0x100; symbol++) lens[symbol] = 9;
				for(; symbol < 0x118; symbol++) lens[symbol] = 7;
				for(; symbol < 0x120; symbol++) lens[symbol] = 8;
				this.construct(this.lencode, lens, 0x120);
				for(symbol=0; symbol < 0x1E; symbol++) lens[symbol] = 5;
				this.construct(this.distcode, lens, 0x1E);
			} else if(type === 2) { /*Dynamic tables*/
				var nlen = this.bits(5) + 257;
				var ndist = this.bits(5) + 1;
				var ncode = this.bits(4) + 4;
				if(nlen > 0x11E || ndist > 0x1E) throw 'Inflater#constructTables: Dynamic block description: Too many length or distance codes';
				for(var i=0; i<ncode; i++) lens[Inflater.DYNAMIC_TABLE_ORDER[i]] = this.bits(3);
				for(; i<19; i++) lens[Inflater.DYNAMIC_TABLE_ORDER[i]] = 0;
				var err = this.construct(this.lencode, lens, 19);
				if(err !== 0) throw 'Inflater#constructTables: Dynamic block description: code lengths codes incomplete';

				var len, symbol;
				i = 0;
				while(i < nlen+ndist) {
					symbol = this.decode(this.lencode);
					if(symbol < 16) lens[i++] = symbol;
					else {
						len = 0;
						if(symbol === 16) {
							if(i === 0) throw 'Inflater#constructTables: Dynamic block description: repeat lengths with no first length';
							len = lens[i-1];
							symbol = 3 + this.bits(2);
						} else if(symbol === 17) symbol = 3 + this.bits(3);
						else symbol = 11 + this.bits(7);
						if(i + symbol > nlen + ndist) throw 'Inflater#constructTables: Dynamic block description: repeat more than specified lengths';
						while(symbol--) lens[i++] = len;
					}
				}

				var err = this.construct(this.lencode, lens, nlen);
				if( err < 0 || (err > 0 && nlen - this.lencode.count[0] !== 1) ) throw 'Inflater#constructTables: Dynamic block description: invalid literal/length code lengths';
				err = this.construct(this.distcode, lens.slice(nlen), ndist);
				if( err < 0 || (err > 0 && ndist - this.distcode.count[0] !== 1) ) throw 'Inflater#constructTables: dynamic block description: invalid distance code lengths';
			} else throw 'Inflater#constructTables: Invalid type: '+type;
		},

		inflate: function() {
			var last, type;
			var i = 0;
			do {
				i++;
				last = this.bits(1);
				type = this.bits(2);

				switch(type) {
					case 0: this.stored(); break;
					case 1:
					case 2: 
						this.lencode = {count:[], symbol:[]},
						this.distcode = {count:[], symbol:[]},
						this.constructTables(type);
						if( this.codes() !== 0) throw 'booby';
					break;
					default: throw 'Inflater#inflate: Invalid block type '+type;
				}
			} while(!last);
			return this.outbuf;
		}
	};
}());
