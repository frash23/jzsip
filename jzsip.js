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

	/*! Not finished - will be changed around */

	var _ZipEntryJs = __webpack_require__(1);

	var _ZipFileJs = __webpack_require__(2);

	var Endian = { BIG: 0, LITTLE: 1 };

	window.Zip = _ZipFileJs.ZipFile;

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
		function ZipFile(_data) {
			_classCallCheck(this, ZipFile);

			this.data = new _BAJs.BA(_data, Endian.LITTLE);
			this.buf = undefined; // ByteArray
			this.entryList = []; // Array
			this.entryTable = {}; // Dict
			this.locOffsetTable = {}; // Dict
			var zipEnd = null;

			this.buf = new _BAJs.BA(this.data.data(), Endian.LITTLE);
			/* Read entries: read end */
			var b = new _BAJs.BA();
			b.endian(Endian.LITTLE);
			/* Read entries: find end */
			var i = this.buf.length() - ZipConstants.ENDHDR; // END header size
			var n = Math.max(0, i - 0xffff); // 0xffff is max zip file comment length
			for (i; i >= n; i--) {
				this.buf.position(i);
				if (this.buf.readByte() != 0x50) continue; // quick check that the byte is 'P'
				this.buf.position(i);
				// "PK\005\006" ¬
				if (this.buf.readUnsignedInt() == 0x06054b50) zipEnd = i;
			}
			if (zipEnd === null) throw 'find end: invalid zip ' + zipEnd;
			b.data(this.buf.readBytes(zipEnd, ZipConstants.ENDHDR));
			b.position(ZipConstants.ENDTOT); // total number of entries
			this.entryList = new Array(b.readUnsignedShort());
			b.position(ZipConstants.ENDOFF); // offset of first CEN header
			this.buf.position(b.readUnsignedInt());
			/* Read entries: main */
			this.entryTable = {};
			this.locOffsetTable = {};
			// read cen entries
			for (var i = 0; i < this.entryList.length; i++) {
				var tmpbuf = new _BAJs.BA(this.buf.readBytes(ZipConstants.CENHDR), Endian.LITTLE);
				if (tmpbuf.readUnsignedInt() != ZipConstants.CENSIG) // "PK\005\006"
					throw 'readEntries::Invalid CEN header (bad signature)';
				// handle filename
				tmpbuf.position(28);
				var len = tmpbuf.readUnsignedShort();
				if (len === 0) throw "missing entry name";
				var e = new _ZipEntryJs.ZipEntry(this.buf.readUTFBytes(len));
				// handle extra field
				len = tmpbuf.readUnsignedShort();
				e.extra = new _BAJs.BA();
				if (len > 0) e.extra.data(this.buf.readBytes(len));
				// handle file comment
				this.buf.move(tmpbuf.readUnsignedShort());
				// now get the remaining fields for the entry
				tmpbuf.position(6); // version needed to extract
				e.version = tmpbuf.readUnsignedShort();
				e.flag = tmpbuf.readUnsignedShort();
				if ((e.flag & 1) == 1) throw "readEntries::Encrypted ZIP entry not supported";
				e.method = tmpbuf.readUnsignedShort();
				e.dostime = tmpbuf.readUnsignedInt();
				e.crc = tmpbuf.readUnsignedInt();
				e.compressedSize = tmpbuf.readUnsignedInt();
				e.size = tmpbuf.readUnsignedInt();
				// add to entries and table
				this.entryList[i] = e;
				this.entryTable[e.name] = e;
				// loc offset
				tmpbuf.position(42); // LOC HEADER
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
				this.buf.position(this.locOffsetTable[entry.name] + 30 - 2);
				var len = this.buf.readShort();
				this.buf.move(entry.name.length + len);
				var b1 = new _BAJs.BA();
				if (entry.compressedSize > 0) {
					b1.data(this.buf.readBytes(entry.compressedSize));
				}
				switch (entry.method) {
					case 0:
						// STORED
						return b1;
						break;
					case 8:
						// DEFLATED
						var b2 = new _BAJs.BA();
						var inflater = new _InflaterJs.Inflater();
						inflater.setInput(b1);
						inflater.inflate(b2);
						b2.position(0);
						return b2;
						break;
					default:
						throw "zipEntry::getInput::Invalid compression method";
				}
			}
		}, {
			key: 'getFile',
			value: function getFile(filename) {
				var entry = this.getEntry(filename);
				if (!entry) throw 'Unable to get entry ' + filename + ' in ZIP';
				var data = this.getInput(entry);
				if (data) {
					data.position(0);
					var utftext = data.readBytes(0, data.length());
					if (utftext.charCodeAt(0) == 0xef && utftext.charCodeAt(1) == 0xbb && utftext.charCodeAt(2) == 0xbf) {
						utftext = utftext.substr(3);
						var string = '';
						var c = c1 = c2 = 0;
						for (var i = 0; i < utftext.length;) {
							c = utftext.charCodeAt(i);
							if (c < 128) {
								string += String.fromCharCode(c);
								i++;
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
				} else return '';
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

	"use strict";

	Object.defineProperty(exports, "__esModule", {
		value: true
	});

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var MAXBITS = 15,
	    MAXLCODES = 286,
	    MAXDCODES = 30,
	    MAXCODES = 316,
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
			key: "bits",
			value: function bits(need) {
				var val = this.bitbuf;
				while (this.bitcnt < need) {
					if (this.incnt === this.inbuf.length) throw 'available inflate data did not terminate';
					val |= this.inbuf.readByteAt(this.incnt++) << this.bitcnt;
					this.bitcnt += 8;
				}
				this.bitbuf = val >> need;
				this.bitcnt -= need;
				return val & (1 << need) - 1;
			}
		}, {
			key: "construct",
			value: function construct(h, length, n) {
				var offs = new Array();
				for (var len = 0; len <= MAXBITS; len++) h.count[len] = 0;
				for (var symbol = 0; symbol < n; symbol++) h.count[length[symbol]]++;
				if (h.count[0] == n) return 0;
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
			key: "decode",
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
			key: "codes",
			value: function codes(buf) {
				do {
					var symbol = this.decode(this.lencode);
					if (symbol < 0) return symbol;
					if (symbol < 256) {
						buf.position(buf.length());
						buf.writeByte(symbol);
					} else if (symbol > 256) {
						symbol -= 257;
						if (symbol >= 29) throw "invalid literal/length or distance code in fixed or dynamic block";
						var len = LENS[symbol] + this.bits(LEXT[symbol]);
						symbol = this.decode(this.distcode);
						if (symbol < 0) return symbol;
						var dist = DISTS[symbol] + this.bits(DEXT[symbol]);
						if (dist > buf.length()) throw "distance is too far back in fixed or dynamic block";
						buf.position(buf.length());
						while (len--) buf.writeByte(buf.readByteAt(buf.length() - dist));
					}
				} while (symbol != 256);
				return 0;
			}
		}, {
			key: "stored",
			value: function stored(buf) {
				this.bitbuf = 0;
				this.bitcnt = 0;
				if (this.incnt + 4 > this.inbuf.length) throw 'available inflate data did not terminate';
				var len = this.inbuf[this.incnt++];
				len |= this.inbuf[this.incnt++] << 8;
				if (this.inbuf[this.incnt++] != (~len & 0xff) || this.inbuf[this.incnt++] != (~len >> 8 & 0xff)) throw "stored block length did not match one's complement";
				if (this.incnt + len > this.inbuf.length()) throw 'available inflate data did not terminate';
				while (len--) buf[buf.length] = this.inbuf[this.incnt++];
			}
		}, {
			key: "constructFixedTables",
			value: function constructFixedTables() {
				var lengths = new Array();
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
			key: "constructDynamicTables",
			value: function constructDynamicTables() {
				var lengths = new Array(),
				    order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15],
				    nlen = this.bits(5) + 257,
				    ndist = this.bits(5) + 1,
				    ncode = this.bits(4) + 4;
				if (nlen > MAXLCODES || ndist > MAXDCODES) throw "dynamic block code description: too many length or distance codes";
				for (var index = 0; index < ncode; index++) lengths[order[index]] = this.bits(3);
				for (; index < 19; index++) lengths[order[index]] = 0;
				var err = this.construct(this.lencode, lengths, 19);
				if (err !== 0) throw "dynamic block code description: code lengths codes incomplete";
				index = 0;
				while (index < nlen + ndist) {
					var symbol = this.decode(this.lencode),
					    len;
					if (symbol < 16) lengths[index++] = symbol;else {
						len = 0;
						if (symbol == 16) {
							if (index === 0) throw "dynamic block code description: repeat lengths with no first length";
							len = lengths[index - 1];
							symbol = 3 + this.bits(2);
						} else if (symbol == 17) symbol = 3 + this.bits(3);else symbol = 11 + this.bits(7);
						if (index + symbol > nlen + ndist) throw "dynamic block code description: repeat more than specified lengths";
						while (symbol--) lengths[index++] = len;
					}
				}

				err = this.construct(this.lencode, lengths, nlen);
				if (err < 0 || err > 0 && nlen - this.lencode.count[0] != 1) throw "dynamic block code description: invalid literal/length code lengths";
				err = this.construct(this.distcode, lengths.slice(nlen), ndist);
				if (err < 0 || err > 0 && ndist - this.distcode.count[0] != 1) throw "dynamic block code description: invalid distance code lengths";
				return err;
			}
		}, {
			key: "setInput",
			value: function setInput(buf) {
				this.inbuf = buf;
				this.inbuf.endian(Endian.LITTLE);
				this.inbuf.position(0);
			}
		}, {
			key: "inflate",
			value: function inflate(buf) {
				this.incnt = this.bitbuf = this.bitcnt = 0;
				var err = 0;
				do {
					var last = this.bits(1);
					var type = this.bits(2);

					if (type === 0) stored(buf); // uncompressed block
					else if (type == 3) throw 'invalid block type (type == 3)';else {
							// compressed block
							this.lencode = { count: new Array(0), symbol: new Array(0) };
							this.distcode = { count: new Array(0), symbol: new Array(0) };
							if (type == 1) this.constructFixedTables();else if (type == 2) err = this.constructDynamicTables();
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

	var warn = function warn(msg) {
		throw msg;
	};
	var Endian = { BIG: 0, LITTLE: 1 };

	var BA = (function () {
		function BA(byteData, endianType) {
			_classCallCheck(this, BA);

			this._bytes = '';
			this._len = 0;
			this._pos = 0;
			this._endian = 0;

			if (byteData) {
				this._bytes = byteData || '';
				this._endian = endianType !== undefined ? endianType : this._endian;
				this._len = byteData.length;
			}

			this.isBA = typeof byteData != 'string' && byteData !== undefined;
		}

		_createClass(BA, [{
			key: 'position',
			value: function position(val) {
				if (val) this._pos = val;else return this._pos;
			}
		}, {
			key: 'move',
			value: function move(val) {
				this._pos += val;
			}
		}, {
			key: 'bytesAvailable',
			value: function bytesAvailable() {
				return this._len - this._pos;
			}
		}, {
			key: 'length',
			value: function length() {
				return this._len;
			}
		}, {
			key: 'endian',
			value: function endian(val) {
				if (val) this._endian = val;else return this._endian;
			}
		}, {
			key: 'data',
			value: function data(val) {
				if (val) {
					this._bytes = val || '';this._len = this._bytes.length;this.isBA = typeof val != 'string' && val !== undefined;
				} else return this._bytes;
			}
		}, {
			key: 'readByte',
			value: function readByte() {
				if (this.bytesAvailable() === 0) {
					warn("readByte::End of stream!");
				}
				return this.isBA ? this._bytes[this._pos++] & 0xFF : this._bytes.charCodeAt(this._pos++) & 0xFF;
			}
		}, {
			key: 'readByteAt',
			value: function readByteAt(index) {
				if (index < this._len) {
					return this.isBA ? this._bytes[index] & 0xFF : this._bytes.charCodeAt(index) & 0xFF;
				}
				return warn("readByteAt::End of stream");
			}
		}, {
			key: 'writeByte',
			value: function writeByte(val) {
				if (this.isBA) {
					if (this._pos < this._len) {
						this._bytes[this._pos] = val & 0xFF;
					} else {
						this._bytes[this._bytes.length++] = val;
					}
					this._pos++;
					return;
				}
				if (this._pos < this._len) {
					this._bytes = this._bytes.substr(0, this._pos) + String.fromCharCode(val & 0xFF) + this._bytes.substring(this._pos + 1);
				} else {
					this._bytes += String.fromCharCode(val & 0xFF);
					this._len += 1;
				}
				this._pos++;
			}
		}, {
			key: 'readBytes',
			value: function readBytes(offset, length) {
				if (length === undefined) {
					var p = this._pos;
					this._pos += offset;
					if (this.isBA) {
						var tmp = '';
						for (var i = p; i < p + offset; i++) {
							tmp += String.fromCharCode(this._bytes[i]);
						}
						return tmp;
					} else {
						return this._bytes.substr(p, offset);
					}
				}
				if (this.isBA) {
					var tmpx = '';
					for (var j = offset; j < offset + length; j++) {
						tmpx += String.fromCharCode(this._bytes[j]);
					}
					return tmpx;
				}
				return this._bytes.substr(offset, length);
			}
		}, {
			key: 'readUnsignedInt',
			value: function readUnsignedInt() {
				if (this.bytesAvailable() < 4) {
					throw "End of stream!";
				}
				var p = 0,
				    x = 0;
				if (this._endian == Endian.BIG) {
					p = (this._pos += 4) - 4;
					if (this.isBA) {
						x = (this._bytes[p] & 0xFF) << 24 | (this._bytes[++p] & 0xFF) << 16 | (this._bytes[++p] & 0xFF) << 8 | this._bytes[++p] & 0xFF;
					} else x = (this._bytes.charCodeAt(p) & 0xFF) << 24 | (this._bytes.charCodeAt(++p) & 0xFF) << 16 | (this._bytes.charCodeAt(++p) & 0xFF) << 8 | this._bytes.charCodeAt(++p) & 0xFF;
				} else {
					p = this._pos += 4;
					if (this.isBA) {
						x = (this._bytes[--p] & 0xFF) << 24 | (this._bytes[--p] & 0xFF) << 16 | (this._bytes[--p] & 0xFF) << 8 | this._bytes[--p] & 0xFF;
					} else x = (this._bytes.charCodeAt(--p) & 0xFF) << 24 | (this._bytes.charCodeAt(--p) & 0xFF) << 16 | (this._bytes.charCodeAt(--p) & 0xFF) << 8 | this._bytes.charCodeAt(--p) & 0xFF;
				}
				return x;
			}
		}, {
			key: 'readUnsignedShort',
			value: function readUnsignedShort() {
				if (this.bytesAvailable() < 2) {
					throw "End of stream!";
				}
				var p = 0;
				if (this._endian == Endian.BIG) {
					p = (this._pos += 2) - 2;
					if (this.isBA) {
						return (this._bytes[p] & 0xFF) << 8 | this._bytes[++p] & 0xFF;
					} else return (this._bytes.charCodeAt(p) & 0xFF) << 8 | this._bytes.charCodeAt(++p) & 0xFF;
				} else {
					p = this._pos += 2;
					if (this.isBA) {
						return (this._bytes[--p] & 0xFF) << 8 | this._bytes[--p] & 0xFF;
					} else return (this._bytes.charCodeAt(--p) & 0xFF) << 8 | this._bytes.charCodeAt(--p) & 0xFF;
				}
			}
		}, {
			key: 'readShort',
			value: function readShort() {
				if (this.bytesAvailable() < 2) {
					throw "End of stream!";
				}
				var p = 0,
				    x = 0;
				if (this._endian == Endian.BIG) {
					p = (this._pos += 2) - 2;
					if (this.isBA) {
						x = (this._bytes[p] & 0xFF) << 8 | this._bytes[++p] & 0xFF;
					} else x = (this._bytes.charCodeAt(p) & 0xFF) << 8 | this._bytes.charCodeAt(++p) & 0xFF;
				} else {
					p = this._pos += 2;
					if (this.isBA) {
						x = (this._bytes[--p] & 0xFF) << 8 | this._bytes[--p] & 0xFF;
					} else x = (this._bytes.charCodeAt(--p) & 0xFF) << 8 | this._bytes.charCodeAt(--p) & 0xFF;
				}
				return x >= 32768 ? x - 65536 : x;
			}
		}, {
			key: 'readUTFBytes',
			value: function readUTFBytes(readLength) {
				readLength = readLength || 0;
				var output = '';
				for (var i = 0; i < readLength; i++) {
					output += String.fromCharCode(this.readByte());
				}
				return output;
			}
		}]);

		return BA;
	})();

	exports.BA = BA;
	;

/***/ }
/******/ ]);