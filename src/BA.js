var warn = function(msg) { throw msg; }
var Endian = {BIG : 0,LITTLE : 1};

export class BA {
	constructor(byteData, endianType) {
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

	position(val) { if (val) this._pos = val; else return this._pos; }
	move(val) { this._pos += val}
	bytesAvailable() { return this._len - this._pos; }
	length() { return this._len; }
	endian(val) { if (val) this._endian = val; else return this._endian; }
	data(val) { if (val) { this._bytes = val || ''; this._len = this._bytes.length; this.isBA = typeof val != 'string' && val !== undefined; } else return this._bytes; }

	readByte() {
		if (this.bytesAvailable() === 0) { warn("readByte::End of stream!"); }
		return this.isBA ? this._bytes[this._pos++] & 0xFF : (this._bytes.charCodeAt(this._pos++) & 0xFF);
	}

	readByteAt(index) {
	  if (index < this._len) {
		  return this.isBA ? this._bytes[index] & 0xFF :this._bytes.charCodeAt(index) & 0xFF
	  }
	  return warn("readByteAt::End of stream");
	}

	writeByte(val) {
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

	readBytes(offset, length) {
		if (length === undefined) {
			var p = this._pos;
			this._pos += offset;
			if(this.isBA) {
				var tmp = '';
				for (var i = p; i < p + offset; i++) {
					tmp += String.fromCharCode(this._bytes[i]);
				}
				return tmp;
			} else {
				return this._bytes.substr(p, offset);
			}
		}
		if(this.isBA) {
			var tmpx = '';
			for (var j = offset; j < offset + length; j++) {
				tmpx += String.fromCharCode(this._bytes[j]);
			}
			return tmpx;
		}
		return this._bytes.substr(offset, length);
	}

	readUnsignedInt() {
		if (this.bytesAvailable() < 4) { throw "End of stream!"; }
		var p = 0, x = 0;
		if (this._endian == Endian.BIG) {
			 p = (this._pos += 4) - 4;
			if(this.isBA) {
				x = ((this._bytes[p] & 0xFF) << 24) | ((this._bytes[++p] & 0xFF) << 16) | ((this._bytes[++p] & 0xFF) << 8) | (this._bytes[++p] & 0xFF);
			} else
			x =  ((this._bytes.charCodeAt(p) & 0xFF) << 24) | ((this._bytes.charCodeAt(++p) & 0xFF) << 16) | ((this._bytes.charCodeAt(++p) & 0xFF) << 8) | (this._bytes.charCodeAt(++p) & 0xFF);
		} else {
			p = (this._pos += 4);
			if(this.isBA) {
				x =  ((this._bytes[--p] & 0xFF) << 24) | ((this._bytes[--p] & 0xFF) << 16) | ((this._bytes[--p] & 0xFF) << 8) | (this._bytes[--p] & 0xFF);
			} else
			x =  ((this._bytes.charCodeAt(--p) & 0xFF) << 24) | ((this._bytes.charCodeAt(--p) & 0xFF) << 16) | ((this._bytes.charCodeAt(--p) & 0xFF) << 8) | (this._bytes.charCodeAt(--p) & 0xFF);
		}
		return x;
	}

	readUnsignedShort() {
		if (this.bytesAvailable() < 2) { throw "End of stream!"; }
		var p = 0;
		if (this._endian == Endian.BIG) {
			p = (this._pos += 2) - 2;
			if(this.isBA) {
				return ((this._bytes[p] & 0xFF) << 8) | (this._bytes[++p] & 0xFF);
			} else
			return ((this._bytes.charCodeAt(p) & 0xFF) << 8) | (this._bytes.charCodeAt(++p) & 0xFF);
		} else {
			p = (this._pos += 2);
			if(this.isBA) {
				return ((this._bytes[--p] & 0xFF) << 8) | (this._bytes[--p] & 0xFF);
			} else
			return ((this._bytes.charCodeAt(--p) & 0xFF) << 8) | (this._bytes.charCodeAt(--p) & 0xFF);
		}
	}

	readShort() {
		if (this.bytesAvailable() < 2) { throw "End of stream!"; }
		var p = 0, x = 0;
		if (this._endian == Endian.BIG) {
			p = (this._pos += 2) - 2;
			if(this.isBA) {
				x = ((this._bytes[p] & 0xFF) << 8) | (this._bytes[++p] & 0xFF);
			} else
			x = ((this._bytes.charCodeAt(p) & 0xFF) << 8) | (this._bytes.charCodeAt(++p) & 0xFF);
		} else {
			p = (this._pos += 2);
			if(this.isBA) {
				x = ((this._bytes[--p] & 0xFF) << 8) | (this._bytes[--p] & 0xFF);
			} else
			x = ((this._bytes.charCodeAt(--p) & 0xFF) << 8) | (this._bytes.charCodeAt(--p) & 0xFF);
		}
		return (x >= 32768) ? x - 65536 : x;
	}

	readUTFBytes(readLength) {
		readLength = readLength || 0;
		var output = '';
		for (var i = 0; i < readLength; i++) {
			output += String.fromCharCode(this.readByte());
		}
		return output;
	}
};
