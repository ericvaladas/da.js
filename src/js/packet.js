import {uint8, int8, uint16, int16, uint32, int32} from './datatypes';
import {dialogCRCTable} from './crc';
import {random} from './util';


function ClientPacket(opcode) {
  this.opcode = opcode;
  this.sequence = 0;
  this.position = 0;
  this.body = [];
}

Object.assign(ClientPacket.prototype, {
  header() {
    const bufferLength = this.body.length + 4;
    let buffer = [];

    buffer.push(0xAA);
    buffer.push(uint8((bufferLength - 3) / 256));
    buffer.push(uint8(bufferLength - 3));
    buffer.push(this.opcode);

    return buffer;
  },

  bodyWithHeader() {
    return this.header().concat(this.body);
  },

  buffer() {
    return new Uint8Array(this.bodyWithHeader()).buffer;
  },

  toString() {
    let output = '';
    const body = this.bodyWithHeader();

    for (let i in body) {
      const hex = body[i].toString(16);
      output += `${hex.length > 1 ? '' : '0'}${hex} `;
    }

    return output.trim().toUpperCase();
  },

  write(buffer) {
    this.body = this.body.concat(buffer);
  },

  writeByte(value) {
    this.body.push(uint8(value));
  },

  writeSbyte(value) {
    this.body.push(int8(value));
  },

  writeBoolean(value) {
    this.body.push(value ? 0x01 : 0x00);
  },

  writeInt16(value) {
    value = int16(value);
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
  },

  writeUint16(value) {
    value = uint16(value);
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
  },

  writeInt32(value) {
    value = int32(value);
    this.body.push((value >> 24) & 0xFF);
    this.body.push((value >> 16) & 0xFF);
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
  },

  writeUint32(value) {
    value = uint32(value);
    this.body.push((value >> 24) & 0xFF);
    this.body.push((value >> 16) & 0xFF);
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
  },

  writeString(value) {
    const buffer = Array.from(new Buffer(value));
    this.body = this.body.concat(buffer);
    this.position += buffer.length;
  },

  writeString8(value) {
    const buffer = Array.from(new Buffer(value));
    this.body.push(buffer.length);
    this.body = this.body.concat(buffer);
    this.position += buffer.length + 1;
  },

  writeString16(value) {
    const buffer = Array.from(new Buffer(value));
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
    this.body = this.body.concat(buffer);
    this.position += buffer.length + 2;
  },

  generateDialogHeader() {
    let crc = 0;

    this.body = this.body.slice(0, 6)
      .concat(this.body.slice(0, this.body.length - 6))
      .concat(this.body.slice(6));

    for (let i = 0; this.body.length - 6; i++) {
      crc = this.body[6 + i] ^ ((crc << 8) ^ dialogCRCTable[crc >> 8]);
    }

    this.body[0] = random(255);
    this.body[1] = random(255);
    this.body[2] = (this.body.length - 4) / 256;
    this.body[3] = (this.body.length - 4) % 256;
    this.body[4] = crc / 256;
    this.body[5] = crc % 256;
  },

  encryptDialog() {
    let length = this.body[2] << 8 | this.body[3];
    let xPrime = this.body[0] - 0x2D;
    let x = this.body[1] ^ xPrime;
    let y = x + 0x72;
    let z = x + 0x28;
    this.body[2] ^= y;
    this.body[3] ^= (y + 1) % 256;

    for (let i = 0; i < length; i++) {
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
  toArray() {
    let bufferLength = this.body.length + 4;
    let buffer = [];

    buffer.push(0xAA);
    buffer.push(uint8((bufferLength - 3) / 256));
    buffer.push(uint8(bufferLength - 3));
    buffer.push(this.opcode);

    if (this.sequence) {
      buffer.push(this.sequence);
    }

    return buffer.concat(this.body);
  },

  toString() {
    let output = '';
    let bodyArray = this.toArray();

    for (let i in bodyArray) {
      let hex = bodyArray[i].toString(16);
      output += `${hex.length > 1 ? '' : '0'}${hex} `;
    }

    return output.trim().toUpperCase();
  },

  read(length) {
    if (this.position + length > this.body.length) {
      return 0;
    }

    let buffer = this.body.slice(this.position, length);
    this.position += length;

    return buffer;
  },

  readByte() {
    if (this.position + 1 > this.body.length) {
      return 0;
    }

    let value = this.body[this.position];
    this.position += 1;

    return value;
  },

  readSbyte() {
    if (this.position + 1 > this.body.length) {
      return 0;
    }

    let value = this.body[this.position];
    this.position += 1;

    return value;
  },

  readBoolean() {
    if (this.position + 1 > this.body.length) {
      return false;
    }

    let value = this.body[this.position] !== 0;
    this.position += 1;

    return value;
  },

  readInt16() {
    if (this.position + 2 > this.body.length) {
      return 0;
    }

    let value = this.body[this.position] << 8 | this.body[this.position + 1];
    this.position += 2;

    return value;
  },

  readUint16() {
    if (this.position + 2 > this.body.length) {
      return 0;
    }

    let value = this.body[this.position] << 8 | this.body[this.position + 1];
    this.position += 2;

    return value;
  },

  readInt32() {
    if (this.position + 4 > this.body.length) {
      return 0;
    }

    let value = (
      this.body[this.position] << 24 |
      this.body[this.position + 1] << 16 |
      this.body[this.position + 2] << 8 |
      this.body[this.position + 3]
    );
    this.position += 4;

    return int32(value);
  },

  readUint32() {
    if (this.position + 4 > this.body.length) {
      return 0;
    }

    let value = (
      this.body[this.position] << 24 |
      this.body[this.position + 1] << 16 |
      this.body[this.position + 2] << 8 |
      this.body[this.position + 3]
    );
    this.position += 4;

    return value;
  },

  readString8() {
    if (this.position + 1 > this.body.length) {
      return '';
    }

    let length = this.body[this.position];
    let position = this.position + 1;

    if (position + length > this.body.length) {
      return '';
    }

    let buffer = this.body.slice(position, position + length);
    this.position += length + 1;

    return String.fromCharCode.apply(null, buffer);
  },

  readString16() {
    if (this.position + 2 > this.body.length) {
      return '';
    }

    let length = this.body[this.position] << 8 | this.body[this.position + 1];
    let position = this.position + 2;

    if (position + length > this.body.length) {
      return '';
    }

    let buffer = this.body.slice(position, position + length);
    this.position += length + 2;

    return String.fromCharCode.apply(null, buffer);
  }
});


export {ClientPacket, ServerPacket};
