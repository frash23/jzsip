/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _ZipEntryJs = __webpack_require__(1);

	var _ZipFileJs = __webpack_require__(2);

	var _BAJs = __webpack_require__(4);

	window.BA = _BAJs.BA;

	window.jzsip = window.jzsip || {
		Zip: _ZipFileJs.ZipFile,
		loadZip: function loadZip(url, cb) {
			var isIE = false;

			var xhr = new XMLHttpRequest();
			xhr.open('GET', url, true);
			xhr.addEventListener('load', function () {
				var data = !isIE ? xhr.responseText : BinArr(xhr.responseBody).toArray();
				var zip = new _ZipFileJs.ZipFile(data);
				cb(zip);
			}, false);

			if (xhr.overrideMimeType) {
				xhr.overrideMimeType('text/plain; charset=x-user-defined');
			} else {
				/* 690865979..toString(30) === 'script'. If you inline the script in HTML, it'd break if the script tags where in plain text */
				var vbScript = '<' + 690865979..toString(30) + ' type="text/vbscript"><!--\nFunction BinArr(Bin)Dim i:ReDim byteArray(LenB(Bin)):For i=1 To LenB(Bin):byteArray(i-1)=AscB(MidB(Bin,i,1)):Next:BinArr=byteArray End Function\n--></' + 690865979..toString(30) + '>';
				document.write(vbScript); /* It's okay to use cancerous code if it's only executed on cancerous browsers, right? */
				xhr.setRequestHeader('Accept-Charset', 'x-user-defined');
				isIE = true;
			}

			xhr.send();
		}
	};

/***/ },
/* 1 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
		value: true
	});

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var ZipEntry = (function () {
		function ZipEntry(name) {
			_classCallCheck(this, ZipEntry);

			this.name = name;
			this.dostime = 0;
			this.flag = 0;
			this.version = 0;
			this.offset = 0;
			this.size = 0;
			this.compressedSize = 0;
			this.crc = 0;
			this.method = 0;
			this.extra = undefined;
			this.comment = '';
		}

		_createClass(ZipEntry, [{
			key: 'getTime',
			value: function getTime() {
				var year = (this.dostime >> 25 & 0x7f) + 1980;
				var month = (this.dostime >> 21 & 0x0f) - 1;
				var day = this.dostime >> 16 & 0x1f;
				var hour = this.dostime >> 11 & 0x1f;
				var minutes = this.dostime >> 5 & 0x3f;
				var seconds = (this.dostime & 0x1f) << 1;
				var d = new Date(year, month, day, hour, minutes, seconds);
				return d.getTime();
			}
		}, {
			key: 'isDirectory',
			value: function isDirectory() {
				return this.name.charAt(this.name.length - 1) === '/';
			}
		}]);

		return ZipEntry;
	})();

	exports.ZipEntry = ZipEntry;
	;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
		value: true
	});

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _InflaterJs = __webpack_require__(3);

	var _ZipEntryJs = __webpack_require__(1);

	var _BAJs = __webpack_require__(4);

	var Endian = { BIG: 0, LITTLE: 1 };
	var ZipConstants = {
		LOCSIG: 0x04034b50, // "PK\003\004"
		LOCHDR: 30, // LOC header size
		LOCVER: 4, // version needed to extract
		LOCNAM: 26, // filename length
		EXTSIG: 0x08074b50, // "PK\007\008"
		EXTHDR: 16, // EXT header size
		CENSIG: 0x02014b50, // "PK\001\002"
		CENHDR: 46, // CEN header size
		CENVER: 6, // version needed to extract
		CENNAM: 28, // filename length
		CENOFF: 42, // LOC header offset
		ENDSIG: 0x06054b50, // "PK\005\006"
		ENDHDR: 22, // END header size
		ENDTOT: 10, // total number of entries
		ENDOFF: 16, // offset of first CEN header
		STORED: 0,
		DEFLATED: 8
	};

	var ZipFile = (function () {
		function ZipFile(data) {
			_classCallCheck(this, ZipFile);

			this.data = new _BAJs.BA(data, Endian.LITTLE);
			this.buf = undefined; // ByteArray
			this.entryList = []; // Array
			this.entryTable = {}; // Dict
			this.locOffsetTable = {}; // Dict
			var zipEnd = null;

			this.buf = new _BAJs.BA(this.data.data, Endian.LITTLE);
			/* Read entries: read end */
			var b = new _BAJs.BA(undefined, Endian.LITTLE);
			/* Read entries: find end */
			var i = this.buf.length - ZipConstants.ENDHDR; // END header size
			var n = Math.max(0, i - 0xffff); // 0xffff is max zip file comment length
			for (; i >= n; i--) {
				this.buf.position = i;
				if (this.buf.readByte() !== 0x50) continue; // quick check that the byte is 'P'
				this.buf.position = i;
				// "PK\005\006" ¬
				if (this.buf.readUnsignedInt() === 0x06054b50) zipEnd = i;
			}
			if (zipEnd === null) throw 'find end: invalid zip ' + zipEnd;

			b.data = this.buf.readBytes(zipEnd, ZipConstants.ENDHDR);
			b.position = ZipConstants.ENDTOT; // total number of entries
			this.entryList = new Array(b.readUnsignedShort());
			b.position = ZipConstants.ENDOFF; // offset of first CEN header
			this.buf.position = b.readUnsignedInt();
			/* Read entries: main */
			// read cen entries
			for (var i = 0, l = this.entryList.length; i < l; i++) {
				var tmpbuf = new _BAJs.BA(this.buf.readBytes(ZipConstants.CENHDR), Endian.LITTLE);
				if (tmpbuf.readUnsignedInt() !== ZipConstants.CENSIG) throw 'read entries: Invalid CEN header (bad signature)'; /*PK\005\006*/
				// handle filename
				tmpbuf.position = 28;
				var len = tmpbuf.readUnsignedShort();
				if (len === 0) throw 'read entries: missing entry name';
				var e = new _ZipEntryJs.ZipEntry(this.buf.readUTFBytes(len));
				// handle extra field
				len = tmpbuf.readUnsignedShort();
				e.extra = new _BAJs.BA();
				if (len > 0) e.extra.data = this.buf.readBytes(len);
				// handle file comment
				this.buf.move(tmpbuf.readUnsignedShort());
				// now get the remaining fields for the entry
				tmpbuf.position = 6; // version needed to extract
				e.version = tmpbuf.readUnsignedShort();
				e.flag = tmpbuf.readUnsignedShort();
				if ((e.flag & 1) === 1) throw 'read entries: Encrypted ZIP entry not supported';
				e.method = tmpbuf.readUnsignedShort();
				e.dostime = tmpbuf.readUnsignedInt();
				e.crc = tmpbuf.readUnsignedInt();
				e.compressedSize = tmpbuf.readUnsignedInt();
				e.size = tmpbuf.readUnsignedInt();
				// add to entries and table
				this.entryList[i] = e;
				this.entryTable[e.name] = e;
				// loc offset
				tmpbuf.position = 42; // LOC HEADER
				this.locOffsetTable[e.name] = tmpbuf.readUnsignedInt();
			}
		}

		_createClass(ZipFile, [{
			key: 'getEntry',
			value: function getEntry(name) {
				return this.entryTable[name];
			}
		}, {
			key: 'getInput',
			value: function getInput(entry) {
				this.buf.position = this.locOffsetTable[entry.name] + 30 - 2;
				var len = this.buf.readShort();
				this.buf.move(entry.name.length + len);
				var b1 = new _BAJs.BA();
				if (entry.compressedSize > 0) b1.data = this.buf.readBytes(entry.compressedSize);
				switch (entry.method) {
					case 0:
						return b1; // STORED

					case 8:
						// DEFLATED
						var b2 = new _BAJs.BA();
						var inflater = new _InflaterJs.Inflater();
						inflater.setInput(b1);
						inflater.inflate(b2);
						return b2;

					default:
						throw 'ZipFile: getInput: Invalid compression method';
				}
			}
		}, {
			key: 'getFile',
			value: function getFile(filename) {
				var entry = this.getEntry(filename);
				if (!entry) throw 'ZipFile: getFile: Unable to find entry ' + filename;
				var data = this.getInput(entry);
				if (!data) return '';

				var utftext = data.readBytes(0, data.length);
				if (utftext.charCodeAt(0) === 0xef && utftext.charCodeAt(1) === 0xbb && utftext.charCodeAt(2) === 0xbf) {
					utftext = utftext.substr(3);
					var string = '';
					var c, c1, c2;
					for (var i = 0, l = utftext.length; i < l;) {
						c = utftext.charCodeAt(i);
						if (c < 128) {
							string += String.fromCharCode(c);i++;
						} else if (c > 191 && c < 224) {
							c2 = utftext.charCodeAt(i + 1);
							string += String.fromCharCode((c & 31) << 6 | c2 & 63);
							i += 2;
						} else {
							c2 = utftext.charCodeAt(i + 1);
							c3 = utftext.charCodeAt(i + 2);
							string += String.fromCharCode((c & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
							i += 3;
						}
					}

					utftext = string;
				}

				return utftext;
			}
		}, {
			key: 'entries',
			get: function get() {
				return this.entryList;
			}
		}, {
			key: 'size',
			get: function get() {
				return this.entryList.length;
			}
		}]);

		return ZipFile;
	})();

	exports.ZipFile = ZipFile;
	;

/***/ },
/* 3 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
		value: true
	});

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var MAXBITS = 15,
	    MAXLCODES = 286,
	    MAXDCODES = 30,
	    FIXLCODES = 288,
	    LENS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258],
	    LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0],
	    DISTS = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577],
	    DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
	var Endian = { BIG: 0, LITTLE: 1 };

	var Inflater = (function () {
		function Inflater() {
			_classCallCheck(this, Inflater);

			this.inbuf = undefined, // input buffer - ByteArray
			this.incnt = 0, // bytes read so far
			this.bitbuf = 0, // bit buffer
			this.bitcnt = 0, // number of bits in bit buffer
			// Huffman code decoding tables
			this.lencode = undefined, this.distcode = undefined;
		}

		_createClass(Inflater, [{
			key: 'bits',
			value: function bits(need) {
				var val = this.bitbuf;
				while (this.bitcnt < need) {
					if (this.incnt === this.inbuf.length) throw 'Inflater: available inflate data did not terminate';
					val |= this.inbuf.readByteAt(this.incnt++) << this.bitcnt;
					this.bitcnt += 8;
				}
				this.bitbuf = val >> need;
				this.bitcnt -= need;
				return val & (1 << need) - 1;
			}
		}, {
			key: 'construct',
			value: function construct(h, length, n) {
				var offs = [];
				for (var len = 0; len <= MAXBITS; len++) h.count[len] = 0;
				for (var symbol = 0; symbol < n; symbol++) h.count[length[symbol]]++;
				if (h.count[0] === n) return 0;
				var left = 1;
				for (len = 1; len <= MAXBITS; len++) {
					left <<= 1;
					left -= h.count[len];
					if (left < 0) return left;
				}
				offs[1] = 0;
				for (len = 1; len < MAXBITS; len++) offs[len + 1] = offs[len] + h.count[len];
				for (symbol = 0; symbol < n; symbol++) if (length[symbol] !== 0) h.symbol[offs[length[symbol]]++] = symbol;
				return left;
			}
		}, {
			key: 'decode',
			value: function decode(h) {
				var code = 0,
				    first = 0,
				    index = 0;
				for (var len = 1; len <= MAXBITS; len++) {
					code |= this.bits(1);
					var count = h.count[len];
					if (code < first + count) return h.symbol[index + (code - first)];
					index += count;
					first += count;
					first <<= 1;
					code <<= 1;
				}
				return -9; // ran out of codes
			}
		}, {
			key: 'codes',
			value: function codes(buf) {
				do {
					var symbol = this.decode(this.lencode);
					if (symbol < 0) return symbol;
					if (symbol < 256) {
						buf.position = buf.length;buf.writeByte(symbol);
					} else if (symbol > 256) {
						symbol -= 257;
						if (symbol >= 29) throw 'Inflater: invalid literal/length or distance code in fixed or dynamic block';
						var len = LENS[symbol] + this.bits(LEXT[symbol]);
						symbol = this.decode(this.distcode);
						if (symbol < 0) return symbol;
						var dist = DISTS[symbol] + this.bits(DEXT[symbol]);
						if (dist > buf.length) throw 'Inflater: distance is too far back in fixed or dynamic block';
						buf.position = buf.length;
						while (len--) buf.writeByte(buf.readByteAt(buf.length - dist));
					}
				} while (symbol != 256);
				return 0;
			}
		}, {
			key: 'stored',
			value: function stored(buf) {
				this.bitbuf = 0;
				this.bitcnt = 0;
				if (this.incnt + 4 > this.inbuf.length) throw 'Inflater: available inflate data did not terminate';
				var len = this.inbuf[this.incnt++];
				len |= this.inbuf[this.incnt++] << 8;
				if (this.inbuf[this.incnt++] != (~len & 0xff) || this.inbuf[this.incnt++] != (~len >> 8 & 0xff)) throw 'Inflater: stored block length did not match one\'s complement';
				if (this.incnt + len > this.inbuf.length) throw 'Inflater: available inflate data did not terminate';
				while (len--) buf[buf.length] = this.inbuf[this.incnt++];
			}
		}, {
			key: 'constructFixedTables',
			value: function constructFixedTables() {
				var lengths = [];
				// literal/length table
				for (var symbol = 0; symbol < 144; symbol++) lengths[symbol] = 8;
				for (; symbol < 256; symbol++) lengths[symbol] = 9;
				for (; symbol < 280; symbol++) lengths[symbol] = 7;
				for (; symbol < FIXLCODES; symbol++) lengths[symbol] = 8;
				this.construct(this.lencode, lengths, FIXLCODES);
				for (symbol = 0; symbol < MAXDCODES; symbol++) lengths[symbol] = 5;
				this.construct(this.distcode, lengths, MAXDCODES);
			}
		}, {
			key: 'constructDynamicTables',
			value: function constructDynamicTables() {
				var lengths = [],
				    order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15],
				    nlen = this.bits(5) + 257,
				    ndist = this.bits(5) + 1,
				    ncode = this.bits(4) + 4;
				if (nlen > MAXLCODES || ndist > MAXDCODES) throw 'Inflater: dynamic block code description: too many length or distance codes';
				for (var index = 0; index < ncode; index++) lengths[order[index]] = this.bits(3);
				for (; index < 19; index++) lengths[order[index]] = 0;
				var err = this.construct(this.lencode, lengths, 19);
				if (err !== 0) throw 'Inflater: dynamic block code description: code lengths codes incomplete';
				index = 0;
				while (index < nlen + ndist) {
					var symbol = this.decode(this.lencode),
					    len;
					if (symbol < 16) lengths[index++] = symbol;else {
						len = 0;
						if (symbol === 16) {
							if (index === 0) throw 'Inflater: dynamic block code description: repeat lengths with no first length';
							len = lengths[index - 1];
							symbol = 3 + this.bits(2);
						} else if (symbol === 17) symbol = 3 + this.bits(3);else symbol = 11 + this.bits(7);
						if (index + symbol > nlen + ndist) throw 'Inflater: dynamic block code description: repeat more than specified lengths';
						while (symbol--) lengths[index++] = len;
					}
				}

				err = this.construct(this.lencode, lengths, nlen);
				if (err < 0 || err > 0 && nlen - this.lencode.count[0] !== 1) throw 'Inflater: dynamic block code description: invalid literal/length code lengths';
				err = this.construct(this.distcode, lengths.slice(nlen), ndist);
				if (err < 0 || err > 0 && ndist - this.distcode.count[0] !== 1) throw 'Inflater: dynamic block code description: invalid distance code lengths';
				return err;
			}
		}, {
			key: 'setInput',
			value: function setInput(buf) {
				this.inbuf = buf;
				this.inbuf.endian = Endian.LITTLE;
			}
		}, {
			key: 'inflate',
			value: function inflate(buf) {
				this.incnt = this.bitbuf = this.bitcnt = 0;
				var err;
				do {
					var last = this.bits(1);
					var type = this.bits(2);

					if (type === 0) stored(buf); // uncompressed block
					else if (type === 3) throw 'Inflater: invalid block type (type === 3)';else {
							// compressed block
							this.lencode = { count: [], symbol: [] };
							this.distcode = { count: [], symbol: [] };
							if (type === 1) this.constructFixedTables();else if (type === 2) err = this.constructDynamicTables();
							if (err !== 0) return err;
							err = this.codes(buf);
						}
					if (err !== 0) break;
				} while (!last);
				return err;
			}
		}]);

		return Inflater;
	})();

	exports.Inflater = Inflater;
	;

/***/ },
/* 4 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
		value: true
	});

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var Endian = { BIG: 0, LITTLE: 1 };

	var BA = (function () {
		function BA(byteData, endianType) {
			_classCallCheck(this, BA);

			this.bytes = byteData || '';
			this.endian = endianType || 0;
			this.len = byteData ? byteData.length : 0;
			this.pos = 0;

			this.isBA = typeof byteData != 'string' && byteData !== undefined;
		}

		_createClass(BA, [{
			key: 'move',
			value: function move(val) {
				this.pos += val;
			}
		}, {
			key: 'readByte',
			value: function readByte() {
				if (this.bytesAvailable === 0) throw 'readByte: End of stream!';
				return this.isBA ? this.bytes[this.pos++] & 0xFF : this.bytes.charCodeAt(this.pos++) & 0xFF;
			}
		}, {
			key: 'readByteAt',
			value: function readByteAt(i) {
				if (i < this.len) return this.isBA ? this.bytes[i] & 0xFF : this.bytes.charCodeAt(i) & 0xFF;else throw 'readByteAt: End of stream';
			}
		}, {
			key: 'writeByte',
			value: function writeByte(val) {
				if (this.isBA) {
					if (this.pos < this.len) this.bytes[this.pos] = val & 0xFF;else this.bytes[this.bytes.length++] = val;

					this.pos++;
					return;
				} else if (this.pos < this.len) {
					this.bytes = this.bytes.substr(0, this.pos) + String.fromCharCode(val & 0xFF) + this.bytes.substring(this.pos + 1);
				} else {
					this.bytes += String.fromCharCode(val & 0xFF);
					this.len += 1;
				}

				this.pos++;
			}
		}, {
			key: 'readBytes',
			value: function readBytes(offset, length) {
				var tmp = '',
				    i;
				if (!length) {
					var p = this.pos;
					this.pos += offset;
					if (this.isBA) {
						for (i = p; i < p + offset; i++) tmp += String.fromCharCode(this.bytes[i]);
						return tmp;
					} else return this.bytes.substr(p, offset);
				} else if (this.isBA) {
					for (i = offset; i < offset + length; i++) tmp += String.fromCharCode(this.bytes[i]);
					return tmp;
				}

				return this.bytes.substr(offset, length);
			}
		}, {
			key: 'readUnsignedInt',
			value: function readUnsignedInt() {
				if (this.bytesAvailable < 4) throw 'readUnsignedInt: End of stream!';
				var p, x;
				if (this.endian === Endian.BIG) {
					p = (this.pos += 4) - 4;
					if (this.isBA) x = (this.bytes[p] & 0xFF) << 24 | (this.bytes[++p] & 0xFF) << 16 | (this.bytes[++p] & 0xFF) << 8 | this.bytes[++p] & 0xFF;else x = (this.bytes.charCodeAt(p) & 0xFF) << 24 | (this.bytes.charCodeAt(++p) & 0xFF) << 16 | (this.bytes.charCodeAt(++p) & 0xFF) << 8 | this.bytes.charCodeAt(++p) & 0xFF;
				} else {
					p = this.pos += 4;
					if (this.isBA) x = (this.bytes[--p] & 0xFF) << 24 | (this.bytes[--p] & 0xFF) << 16 | (this.bytes[--p] & 0xFF) << 8 | this.bytes[--p] & 0xFF;else x = (this.bytes.charCodeAt(--p) & 0xFF) << 24 | (this.bytes.charCodeAt(--p) & 0xFF) << 16 | (this.bytes.charCodeAt(--p) & 0xFF) << 8 | this.bytes.charCodeAt(--p) & 0xFF;
				}

				return x;
			}
		}, {
			key: 'readUnsignedShort',
			value: function readUnsignedShort() {
				if (this.bytesAvailable < 2) throw 'readUnsignedShort: End of stream!';
				var p;
				if (this.endian === Endian.BIG) {
					p = (this.pos += 2) - 2;
					if (this.isBA) return (this.bytes[p] & 0xFF) << 8 | this.bytes[++p] & 0xFF;else return (this.bytes.charCodeAt(p) & 0xFF) << 8 | this.bytes.charCodeAt(++p) & 0xFF;
				} else {
					p = this.pos += 2;
					if (this.isBA) return (this.bytes[--p] & 0xFF) << 8 | this.bytes[--p] & 0xFF;else return (this.bytes.charCodeAt(--p) & 0xFF) << 8 | this.bytes.charCodeAt(--p) & 0xFF;
				}
			}
		}, {
			key: 'readShort',
			value: function readShort() {
				if (this.bytesAvailable < 2) throw 'readShort: End of stream!';
				var p, x;
				if (this.endian == Endian.BIG) {
					p = (this.pos += 2) - 2;
					if (this.isBA) x = (this.bytes[p] & 0xFF) << 8 | this.bytes[++p] & 0xFF;else x = (this.bytes.charCodeAt(p) & 0xFF) << 8 | this.bytes.charCodeAt(++p) & 0xFF;
				} else {
					p = this.pos += 2;
					if (this.isBA) x = (this.bytes[--p] & 0xFF) << 8 | this.bytes[--p] & 0xFF;else x = (this.bytes.charCodeAt(--p) & 0xFF) << 8 | this.bytes.charCodeAt(--p) & 0xFF;
				}

				return x >= 32768 ? x - 65536 : x;
			}
		}, {
			key: 'readUTFBytes',
			value: function readUTFBytes(readLength) {
				readLength = readLength || 0;
				var output = '';
				for (var i = 0; i < readLength; i++) output += String.fromCharCode(this.readByte());

				return output;
			}
		}, {
			key: 'position',
			set: function set(val) {
				this.pos = val;
			},
			get: function get() {
				return this.pos;
			}
		}, {
			key: 'bytesAvailable',
			get: function get() {
				return this.len - this.pos;
			}
		}, {
			key: 'length',
			get: function get() {
				return this.len;
			}
		}, {
			key: 'data',
			set: function set(val) {
				this.bytes = val || '';this.len = this.bytes.length;this.isBA = typeof val != 'string' && val !== undefined;
			},
			get: function get() {
				return this.bytes;
			}
		}]);

		return BA;
	})();

	exports.BA = BA;
	;

/***/ }
/******/ ]);