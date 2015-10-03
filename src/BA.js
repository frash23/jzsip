var Endian = {BIG : 0,LITTLE : 1};

export class BA {
	constructor(byteData, endianType) {
		this.bytes = '';
		this.len = 0;
		this.pos = 0;
		this.endian = 0;

		if (byteData) {
			this.bytes = byteData || '';
			this.endian = endianType !== undefined ? endianType : this.endian;
			this.len = byteData.length;
		}

		this.isBA = typeof byteData != 'string' && byteData !== undefined;
	}

	set position(val)		{ this.pos = val; }
	get position() 		{ return this.pos; }
	get bytesAvailable()	{ return this.len - this.pos; }
	get length()			{ return this.len; }
	set data(val)			{ this.bytes = val || ''; this.len = this.bytes.length; this.isBA = typeof val != 'string' && val !== undefined; }
	get data()				{ return this.bytes; }
	move(val) 				{ this.pos += val; }

	readByte() {
		if(this.bytesAvailable === 0) throw 'readByte: End of stream!';
		return this.isBA ? this.bytes[this.pos++] & 0xFF : (this.bytes.charCodeAt(this.pos++) & 0xFF);
	}

	readByteAt(i) {
	  if(i < this.len) return this.isBA ? this.bytes[i] & 0xFF :this.bytes.charCodeAt(i) & 0xFF;
	  else throw 'readByteAt: End of stream';
	}

	writeByte(val) {
		if(this.isBA) {
			if(this.pos < this.len) this.bytes[this.pos] = val & 0xFF;
			else this.bytes[this.bytes.length++] = val;

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

	readBytes(offset, length) {
		var tmp = '', i;
		if(!length) {
			var p = this.pos;
			this.pos += offset;
			if(this.isBA) {
				for(i=p; i<p+offset; i++) tmp += String.fromCharCode(this.bytes[i]);
				return tmp;
			} else return this.bytes.substr(p, offset);
		} else if(this.isBA) {
			for(i=offset; i<offset+length; i++) tmp += String.fromCharCode(this.bytes[i]);
			return tmp;
		}

		return this.bytes.substr(offset, length);
	}

	readUnsignedInt() {
		if(this.bytesAvailable < 4) throw 'readUnsignedInt: End of stream!';
		var p, x;
		if(this.endian === Endian.BIG) {
			p = (this.pos += 4) - 4;
			if(this.isBA) x = ((this.bytes[p] & 0xFF) << 24) | ((this.bytes[++p] & 0xFF) << 16) | ((this.bytes[++p] & 0xFF) << 8) | (this.bytes[++p] & 0xFF);
			else x = ((this.bytes.charCodeAt(p) & 0xFF) << 24) | ((this.bytes.charCodeAt(++p) & 0xFF) << 16) | ((this.bytes.charCodeAt(++p) & 0xFF) << 8) | (this.bytes.charCodeAt(++p) & 0xFF);
		} else {
			p = (this.pos += 4);
			if(this.isBA) x = ((this.bytes[--p] & 0xFF) << 24) | ((this.bytes[--p] & 0xFF) << 16) | ((this.bytes[--p] & 0xFF) << 8) | (this.bytes[--p] & 0xFF);
			else x = ((this.bytes.charCodeAt(--p) & 0xFF) << 24) | ((this.bytes.charCodeAt(--p) & 0xFF) << 16) | ((this.bytes.charCodeAt(--p) & 0xFF) << 8) | (this.bytes.charCodeAt(--p) & 0xFF);
		}

		return x;
	}

	readUnsignedShort() {
		if(this.bytesAvailable < 2) throw 'readUnsignedShort: End of stream!';
		var p;
		if(this.endian === Endian.BIG) {
			p = (this.pos += 2) - 2;
			if(this.isBA) return ((this.bytes[p] & 0xFF) << 8) | (this.bytes[++p] & 0xFF);
			else return ((this.bytes.charCodeAt(p) & 0xFF) << 8) | (this.bytes.charCodeAt(++p) & 0xFF);
		} else {
			p = (this.pos += 2);
			if(this.isBA) return ((this.bytes[--p] & 0xFF) << 8) | (this.bytes[--p] & 0xFF);
			else return ((this.bytes.charCodeAt(--p) & 0xFF) << 8) | (this.bytes.charCodeAt(--p) & 0xFF);
		}
	}

	readShort() {
		if(this.bytesAvailable < 2) throw 'readShort: End of stream!';
		var p, x;
		if(this.endian == Endian.BIG) {
			p = (this.pos += 2) - 2;
			if(this.isBA) x = ((this.bytes[p] & 0xFF) << 8) | (this.bytes[++p] & 0xFF);
			else x = ((this.bytes.charCodeAt(p) & 0xFF) << 8) | (this.bytes.charCodeAt(++p) & 0xFF);
		} else {
			p = (this.pos += 2);
			if(this.isBA) x = ((this.bytes[--p] & 0xFF) << 8) | (this.bytes[--p] & 0xFF);
			else x = ((this.bytes.charCodeAt(--p) & 0xFF) << 8) | (this.bytes.charCodeAt(--p) & 0xFF);
		}

		return x>=32768? x - 65536 : x;
	}

	readUTFBytes(readLength) {
		readLength = readLength || 0;
		var output = '';
		for (var i=0; i<readLength; i++) output += String.fromCharCode( this.readByte() );
		
		return output;
	}
};
