export class ZipEntry {
	constructor(name) {
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

	getTime() {
		var year = ((this.dostime >> 25) & 0x7f) + 1980;
		var month = ((this.dostime >> 21) & 0x0f) - 1;
		var day = (this.dostime >> 16) & 0x1f;
		var hour = (this.dostime >> 11) & 0x1f;
		var minutes = (this.dostime >> 5) & 0x3f;
		var seconds = (this.dostime & 0x1f) << 1;
		var d = new Date(year, month, day, hour, minutes, seconds);
		return d.getTime();
	}
	
	isDirectory() {
		return this.name.charAt(this.name.length - 1) === '/';
	}
};
