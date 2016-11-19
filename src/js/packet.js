function ClientPacket(opcode) {
  this.opcode = opcode;
  this.sequence = 0;
  this.position = 0;
  this.body = [];
}

Object.assign(ClientPacket.prototype, {
  header: function() {
    var bufferLength = this.body.length + 4;
    var buffer = [];

    buffer.push(0xAA);
    buffer.push(uint8((bufferLength - 3) / 256));
    buffer.push(uint8(bufferLength - 3));
    buffer.push(this.opcode);

    return buffer
  },

  bodyWithHeader: function() {
    return this.header().concat(this.body);
  },

  buffer: function() {
    return new Uint8Array(this.bodyWithHeader()).buffer;
  },

  toString: function() {
    var output = "";
    var body = this.bodyWithHeader();

    for (var i in body) {
      var hex = body[i].toString(16);
      output += "{0}{1} ".format(hex.length > 1 ? "" : "0", hex);
    }

    return output.trim().toUpperCase();
  },

  write: function(buffer) {
    this.body = this.body.concat(buffer);
  },

  writeByte: function(value) {
    this.body.push(uint8(value));
  },

  writeSbyte: function(value) {
    this.body.push(int8(value));
  },

  writeBoolean: function(value) {
    this.body.push(value ? 0x01 : 0x00);
  },

  writeInt16: function(value) {
    var value = int16(value);
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
  },

  writeUint16: function(value) {
    var value = uint16(value);
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
  },

  writeInt32: function(value) {
    var value = int32(value);
    this.body.push((value >> 24) & 0xFF);
    this.body.push((value >> 16) & 0xFF);
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
  },

  writeUint32: function(value) {
    var value = uint32(value);
    this.body.push((value >> 24) & 0xFF);
    this.body.push((value >> 16) & 0xFF);
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
  },

  writeString: function(value) {
    var buffer = getBytes(value);
    this.body = this.body.concat(buffer);
    this.position += buffer.length;
  },

  writeString8: function(value) {
    var buffer = getBytes(value);
    this.body.push(buffer.length);
    this.body = this.body.concat(buffer);
    this.position += buffer.length + 1;
  },

  writeString16: function(value) {
    var buffer = getBytes(value);
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
    this.body = this.body.concat(buffer);
    this.position += buffer.length + 2;
  },

  encryptDialog: function() {
    var crc = 0;

    this.body = this.body.slice(0, 6)
      .concat(this.body.slice(0, this.body.length - 6))
      .concat(this.body.slice(6));

    for (var i = 0; this.body.length - 6; i++) {
      crc = this.body[6 + i] ^ ((crc << 8) ^ dialogCRCTable[crc >> 8]);
    }

    this.body[0] = random(0, 255);
    this.body[1] = random(0, 255);
    this.body[2] = (this.body.length - 4) / 256;
    this.body[3] = (this.body.length - 4) % 256;
    this.body[4] = crc / 256;
    this.body[5] = crc % 256;

    var length = this.body[2] << 8 | this.body[3];
    var xPrime = this.body[0] - 0x2D;
    var x = this.body[1] ^ xPrime;
    var y = x + 0x72;
    var z = x + 0x28;
    this.body[2] ^= y;
    this.body[3] ^= (y + 1) % 256;

    for (var i = 0; i < length; i++) {
      this.body[4 + i] ^= (z + i) % 256;
    }
  }
});


function ServerPacket(buffer) {
  this.opcode = buffer[3];
  this.sequence = 0;
  this.position = 0;
  this.body = buffer.slice(3);
}

Object.assign(ServerPacket.prototype, {
  toArray: function() {
    var bufferLength = this.body.length + 4;
    var buffer = [];

    buffer.push(0xAA);
    buffer.push(uint8((bufferLength - 3) / 256));
    buffer.push(uint8(bufferLength - 3));
    buffer.push(this.opcode);

    if (this.sequence) {
      buffer.push(this.sequence);
    }

    return buffer.concat(this.body);
  },

  toString: function() {
    var output = "";
    var bodyArray = this.toArray();

    for (var i in bodyArray) {
      var hex = bodyArray[i].toString(16);
      output += "{0}{1} ".format(hex.length > 1 ? "" : "0", hex);
    }

    return output.trim().toUpperCase();
  },

  read: function(length) {
    if (this.position + length > this.body.length) {
      return 0;
    }

    var buffer = this.body.slice(this.position, length);
    this.position += length;

    return buffer;
  },

  readByte: function() {
    if (this.position + 1 > this.body.length) {
      return 0;
    }

    var value = this.body[this.position];
    this.position += 1;

    return value;
  },

  readSbyte: function() {
    if (this.position + 1 > this.body.length) {
      return 0;
    }

    var value = this.body[this.position];
    this.position += 1;

    return value;
  },

  readBoolean: function() {
    if (this.position + 1 > this.body.length) {
      return false;
    }

    var value = this.body[this.position] != 0;
    this.position += 1;

    return value;
  },

  readInt16: function() {
    if (this.position + 2 > this.body.length) {
      return 0;
    }

    var value = this.body[this.position] << 8 | this.body[this.position + 1];
    this.position += 2;

    return value;
  },

  readUint16: function() {
    if (this.position + 2 > this.body.length) {
      return 0;
    }

    var value = this.body[this.position] << 8 | this.body[this.position + 1];
    this.position += 2;

    return value;
  },

  readInt32: function() {
    if (this.position + 4 > this.body.length) {
      return 0;
    }

    var value = this.body[this.position] << 24 | this.body[this.position + 1] << 16 | this.body[this.position + 2] << 8 | this.body[this.position + 3];
    this.position += 4;

    return int32(value);
  },

  readUint32: function() {
    if (this.position + 4 > this.body.length) {
      return 0;
    }

    var value = this.body[this.position] << 24 | this.body[this.position + 1] << 16 | this.body[this.position + 2] << 8 | this.body[this.position + 3];
    this.position += 4;

    return value;
  },

  readString8: function() {
    if (this.position + 1 > this.body.length) {
      return "";
    }

    var length = this.body[this.position]
    var position = this.position + 1

    if (position + length > this.body.length) {
      return "";
    }

    var buffer = this.body.slice(position, position + length);
    this.position += length + 1;

    return String.fromCharCode.apply(null, buffer)
  },

  readString16: function() {
    if (this.position + 2 > this.body.length) {
      return "";
    }

    var length = this.body[this.position] << 8 | this.body[this.position + 1];
    var position = this.position + 2;

    if (position + length > this.body.length) {
      return "";
    }

    var buffer = this.body.slice(position, position + length);
    this.position += length + 2;

    return String.fromCharCode.apply(null, buffer);
  },

});
