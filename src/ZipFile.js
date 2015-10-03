import { Inflater } from './Inflater.js';
import { ZipEntry } from './ZipEntry.js';
import { BA } from './BA.js';

var Endian = {BIG : 0,LITTLE : 1};
var ZipConstants = {
	LOCSIG: 0x04034b50,	// "PK\003\004"
	LOCHDR: 30,	// LOC header size
	LOCVER: 4,	// version needed to extract
	LOCNAM: 26, // filename length
	EXTSIG: 0x08074b50,	// "PK\007\008"
	EXTHDR: 16,	// EXT header size
	CENSIG: 0x02014b50,	// "PK\001\002"
	CENHDR: 46,	// CEN header size
	CENVER: 6, // version needed to extract
	CENNAM: 28, // filename length
	CENOFF: 42, // LOC header offset
	ENDSIG: 0x06054b50,	// "PK\005\006"
	ENDHDR: 22, // END header size
	ENDTOT: 10,	// total number of entries
	ENDOFF: 16, // offset of first CEN header
	STORED: 0,
	DEFLATED: 8
};

export class ZipFile {
	constructor(data) {
		this.data = new BA(data, Endian.LITTLE);
		this.buf = undefined; // ByteArray
		this.entryList = []; // Array
		this.entryTable = {}; // Dict
		this.locOffsetTable = {}; // Dict
		var zipEnd = null;

		this.buf = new BA(this.data.data, Endian.LITTLE);
		/* Read entries: read end */
		var b = new BA(undefined, Endian.LITTLE);
		//b.endian = Endian.LITTLE;
		/* Read entries: find end */
		var i = this.buf.length - ZipConstants.ENDHDR; // END header size
		var n = Math.max(0, i - 0xffff); // 0xffff is max zip file comment length
		for(; i >= n; i--) {
			this.buf.position = i;
			if(this.buf.readByte() != 0x50) continue; // quick check that the byte is 'P'
			this.buf.position = i;
			// "PK\005\006" ¬
			if(this.buf.readUnsignedInt() == 0x06054b50) zipEnd = i;
		}
		if(zipEnd === null) throw 'find end: invalid zip '+ zipEnd;

		b.data = this.buf.readBytes(zipEnd, ZipConstants.ENDHDR);
		b.position = ZipConstants.ENDTOT; // total number of entries
		this.entryList = new Array(b.readUnsignedShort());
		b.position = ZipConstants.ENDOFF; // offset of first CEN header
		this.buf.position = b.readUnsignedInt();
		/* Read entries: main */
		this.entryTable = {};
		this.locOffsetTable = {};
		// read cen entries
		for(var i = 0; i < this.entryList.length; i++) {
			var tmpbuf = new BA(this.buf.readBytes(ZipConstants.CENHDR), Endian.LITTLE);
			if(tmpbuf.readUnsignedInt() != ZipConstants.CENSIG)  // "PK\005\006"
				throw 'readEntries::Invalid CEN header (bad signature)';
			// handle filename
			tmpbuf.position = 28;
			var len = tmpbuf.readUnsignedShort();
			if(len === 0) throw "missing entry name";
			var e = new ZipEntry(this.buf.readUTFBytes(len));
			// handle extra field
			len = tmpbuf.readUnsignedShort();
			e.extra = new BA();
			if(len > 0) e.extra.data = this.buf.readBytes(len);
			// handle file comment
			this.buf.move(tmpbuf.readUnsignedShort());
			// now get the remaining fields for the entry
			tmpbuf.position = 6; // version needed to extract
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
			tmpbuf.position = 42; // LOC HEADER
			this.locOffsetTable[e.name] = tmpbuf.readUnsignedInt();
		}
	}

	get entries() { return this.entryList }
	get size() { return this.entryList.length }
	getEntry(name) { return this.entryTable[name]; }

	getInput(entry) {
		this.buf.position = this.locOffsetTable[entry.name] + 30 - 2;
		var len = this.buf.readShort();
		this.buf.move(entry.name.length + len);
		var b1 = new BA();
		if(entry.compressedSize > 0) {
			b1.data = this.buf.readBytes(entry.compressedSize);
		}
		switch(entry.method) {
			case 0: // STORED
				return b1;
				break;
			case 8: // DEFLATED
				var b2 = new BA();
				var inflater = new Inflater();
				inflater.setInput(b1);
				inflater.inflate(b2);
				return b2;
				break;
			default:
				throw "zipEntry::getInput::Invalid compression method";
		}
	}
	
	getFile(filename) {
		var entry = this.getEntry(filename);
		if(!entry) throw 'Unable to get entry '+ filename +' in ZIP';
		var data = this.getInput(entry);
		if(data) {
			var utftext = data.readBytes(0, data.length);
			if(utftext.charCodeAt(0) == 0xef && utftext.charCodeAt(1) == 0xbb && utftext.charCodeAt(2) == 0xbf) {
				utftext = utftext.substr(3)
				var string = '';
				var c = c1 = c2 = 0;
				for(var i=0; i<utftext.length;) {
					c = utftext.charCodeAt(i);
					if (c < 128) {
						string += String.fromCharCode(c);
						i++;
					} else if((c > 191) && (c < 224)) {
						c2 = utftext.charCodeAt(i+1);
						string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
						i += 2;
					} else {
						c2 = utftext.charCodeAt(i+1);
						c3 = utftext.charCodeAt(i+2);
						string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
						i += 3;
					}
				}

				utftext = string;
			}
			return utftext;
		} else return '';
	}
};
