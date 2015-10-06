var	MAXBITS = 15, MAXLCODES = 286, MAXDCODES = 30, FIXLCODES = 288,
		LENS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258],
		LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0],
		DISTS = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577],
		DEXT = [ 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
var Endian = {BIG : 0,LITTLE : 1};

export class Inflater {
	constructor() {
		this.inbuf = undefined, // input buffer - ByteArray
		this.incnt = 0,  // bytes read so far
		this.bitbuf = 0, // bit buffer
		this.bitcnt = 0, // number of bits in bit buffer
		// Huffman code decoding tables
		this.lencode = undefined,
		this.distcode = undefined;
	}

	bits(need) {
		var val = this.bitbuf;
		while(this.bitcnt < need) {
			if(this.incnt === this.inbuf.length) throw 'Inflater: available inflate data did not terminate';
			val |= this.inbuf.readByteAt(this.incnt++) << this.bitcnt;
			this.bitcnt += 8;
		}
		this.bitbuf = val >> need;
		this.bitcnt -= need;
		return val & ((1 << need) - 1);
	}

	construct(h, length, n) {
		var offs = [];
		for(var len = 0; len <= MAXBITS; len++) h.count[len] = 0;
		for(var symbol = 0; symbol < n; symbol++) h.count[length[symbol]]++;
		if(h.count[0] === n) return 0;
		var left = 1;
		for(len = 1; len <= MAXBITS; len++) {
			left <<= 1;
			left -= h.count[len];
			if(left < 0) return left;
		}
		offs[1] = 0;
		for(len = 1; len < MAXBITS; len++) offs[len + 1] = offs[len] + h.count[len];
		for(symbol = 0; symbol < n; symbol++) if(length[symbol] !== 0) h.symbol[offs[length[symbol]]++] = symbol;
		return left;
	}

	decode(h) {
		var code = 0, first = 0, index = 0;
		for(var len = 1; len <= MAXBITS; len++) {
			code |= this.bits(1);
			var count = h.count[len];
			if(code < first + count) return h.symbol[index + (code - first)];
			index += count;
			first += count;
			first <<= 1;
			code <<= 1;
		}
		return -9; // ran out of codes
	}

	codes(buf) {
		do {
			var symbol = this.decode(this.lencode);
			if(symbol < 0) return symbol;
			if(symbol < 256) { buf.position = buf.length; buf.writeByte(symbol); }
			else if(symbol > 256) {
				symbol -= 257;
				if(symbol >= 29) throw 'Inflater: invalid literal/length or distance code in fixed or dynamic block';
				var len = LENS[symbol] + this.bits(LEXT[symbol]);
				symbol = this.decode(this.distcode);
				if(symbol < 0) return symbol;
				var dist = DISTS[symbol] + this.bits(DEXT[symbol]);
				if(dist > buf.length) throw 'Inflater: distance is too far back in fixed or dynamic block';
				buf.position = buf.length;
				while(len--) buf.writeByte(buf.readByteAt(buf.length - dist));
			}
		} while (symbol != 256);
		return 0;
	}

	stored(buf) {
		this.bitbuf = 0;
		this.bitcnt = 0;
		if(this.incnt + 4 > this.inbuf.length) throw 'Inflater: available inflate data did not terminate';
		var len = this.inbuf.readByteAt(this.incnt++);
		len |= this.inbuf.readByteAt(this.incnt++) << 8;
		if(this.inbuf.readByteAt(this.incnt++) !== (~len & 0xff)
		|| this.inbuf.readByteAt(this.incnt++) !== ((~len >> 8) & 0xff)) throw 'Inflater: stored block length did not match one\'s complement';
		if(this.incnt + len > this.inbuf.length) throw 'Inflater: available inflate data did not terminate';
		while(len--) buf.data = buf.bytes + String.fromCharCode( this.inbuf.readByteAt(this.incnt++) );
	}

	constructFixedTables() {
		var lengths = [];
		// literal/length table
		for(var symbol = 0; symbol < 144; symbol++) lengths[symbol] = 8;
		for(; symbol < 256; symbol++) lengths[symbol] = 9;
		for(; symbol < 280; symbol++) lengths[symbol] = 7;
		for(; symbol < FIXLCODES; symbol++) lengths[symbol] = 8;
		this.construct(this.lencode, lengths, FIXLCODES);
		for(symbol = 0; symbol < MAXDCODES; symbol++) lengths[symbol] = 5;
		this.construct(this.distcode, lengths, MAXDCODES);
	}

	constructDynamicTables() {
		var lengths = [],
			order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15],
			nlen = this.bits(5) + 257,
			ndist = this.bits(5) + 1,
			ncode = this.bits(4) + 4;
		if(nlen > MAXLCODES || ndist > MAXDCODES) throw 'Inflater: dynamic block code description: too many length or distance codes';
		for(var index = 0; index < ncode; index++) lengths[order[index]] = this.bits(3);
		for(; index < 19; index++) lengths[order[index]] = 0;
		var err = this.construct(this.lencode, lengths, 19);
		if(err !== 0) throw 'Inflater: dynamic block code description: code lengths codes incomplete';
		index = 0;
		while(index < nlen + ndist) {
			var symbol = this.decode(this.lencode), len;
			if(symbol < 16) lengths[index++] = symbol;
			else {
				len = 0;
				if(symbol === 16) {
					if(index === 0) throw 'Inflater: dynamic block code description: repeat lengths with no first length';
					len = lengths[index - 1];
					symbol = 3 + this.bits(2);
				}
				else if(symbol === 17) symbol = 3 + this.bits(3);
				else symbol = 11 + this.bits(7);
				if(index + symbol > nlen + ndist) throw 'Inflater: dynamic block code description: repeat more than specified lengths';
				while(symbol--) lengths[index++] = len;
			}
		}

		err = this.construct(this.lencode, lengths, nlen);
		if(err < 0 || (err > 0 && nlen - this.lencode.count[0] !== 1)) throw 'Inflater: dynamic block code description: invalid literal/length code lengths';
		err = this.construct(this.distcode, lengths.slice(nlen), ndist);
		if(err < 0 || (err > 0 && ndist - this.distcode.count[0] !== 1)) throw 'Inflater: dynamic block code description: invalid distance code lengths';
		return err;
	}

	setInput(buf) {
		this.inbuf = buf;
		this.inbuf.endian = Endian.LITTLE;
	}

	inflate(buf) {
		this.incnt = this.bitbuf = this.bitcnt = 0;
		var err;
		do {
			var last = this.bits(1);
			var type = this.bits(2);
			
			if(type === 0) this.stored(buf); // uncompressed block
			else if(type === 3) throw 'Inflater: invalid block type (type === 3)';
			else { // compressed block
				this.lencode = {count:[], symbol:[]};
				this.distcode = {count:[], symbol:[]};
				if(type === 1) this.constructFixedTables();
				else if(type === 2) err = this.constructDynamicTables();
				if(err !== 0) return err;
				err = this.codes(buf);
			}
			if(err !== 0) break;
		} while (!last);
		return err;
	}
};
