import { uint8, uint16, int16, uint32, int32 } from './datatypes';
import { toHex } from './util';


export default class {
  constructor(arg) {
    if (arg.constructor === Number) {
      this.opcode = arg;
      this.sequence = 0;
      this.position = 0;
      this.body = [];
    }
    else {
      this.opcode = arg[3];
      this.sequence = 0;
      this.position = 0;
      this.body = Array.from(arg.slice(4));
    }
  }

  header() {
    const packetLength = this.body.length + 4;
    return [
      0xAA,
      uint8((packetLength - 3) >> 8),
      uint8(packetLength - 3),
      this.opcode
    ];
  }

  bodyWithHeader() {
    return this.header().concat(this.body);
  }

  buffer() {
    return Buffer.from(this.bodyWithHeader());
  }

  toString() {
    return this.bodyWithHeader()
      .map(byte => toHex(byte))
      .join(' ');
  }

  read(length) {
    if (this.position + length > this.body.length) {
      return 0;
    }

    const buffer = this.body.slice(this.position, this.position + length);
    this.position += length;

    return buffer;
  }

  readByte() {
    if (this.position + 1 > this.body.length) {
      return 0;
    }

    const value = this.body[this.position];
    this.position += 1;

    return value;
  }

  readInt16() {
    if (this.position + 2 > this.body.length) {
      return 0;
    }

    const value = this.body[this.position] << 8 | this.body[this.position + 1];
    this.position += 2;

    return value;
  }

  readUInt16() {
    if (this.position + 2 > this.body.length) {
      return 0;
    }

    const value = this.body[this.position] << 8 | this.body[this.position + 1];
    this.position += 2;

    return value;
  }

  readInt32() {
    if (this.position + 4 > this.body.length) {
      return 0;
    }

    const value = (
      this.body[this.position] << 24 |
      this.body[this.position + 1] << 16 |
      this.body[this.position + 2] << 8 |
      this.body[this.position + 3]
    );
    this.position += 4;

    return int32(value);
  }

  readUInt32() {
    if (this.position + 4 > this.body.length) {
      return 0;
    }

    const value = (
      this.body[this.position] << 24 |
      this.body[this.position + 1] << 16 |
      this.body[this.position + 2] << 8 |
      this.body[this.position + 3]
    );
    this.position += 4;

    return value;
  }

  readString8() {
    if (this.position + 1 > this.body.length) {
      return '';
    }

    const length = this.body[this.position];
    const position = this.position + 1;

    if (position + length > this.body.length) {
      return '';
    }

    const buffer = this.body.slice(position, position + length);
    this.position += length + 1;

    return String.fromCharCode.apply(null, buffer);
  }

  readString16() {
    if (this.position + 2 > this.body.length) {
      return '';
    }

    const length = this.body[this.position] << 8 | this.body[this.position + 1];
    const position = this.position + 2;

    if (position + length > this.body.length) {
      return '';
    }

    const buffer = this.body.slice(position, position + length);
    this.position += length + 2;

    return String.fromCharCode.apply(null, buffer);
  }

  write(buffer) {
    this.body = this.body.concat(buffer);
  }

  writeByte(value) {
    this.body.push(uint8(value));
  }

  writeInt16(value) {
    value = int16(value);
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
  }

  writeUInt16(value) {
    value = uint16(value);
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
  }

  writeInt32(value) {
    value = int32(value);
    this.body.push((value >> 24) & 0xFF);
    this.body.push((value >> 16) & 0xFF);
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
  }

  writeUInt32(value) {
    value = uint32(value);
    this.body.push((value >> 24) & 0xFF);
    this.body.push((value >> 16) & 0xFF);
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
  }

  writeString(value) {
    const buffer = Array.from(Buffer.from(value));
    this.body = this.body.concat(buffer);
    this.position += buffer.length;
  }

  writeString8(value) {
    const buffer = Array.from(Buffer.from(value));
    this.body.push(buffer.length);
    this.body = this.body.concat(buffer);
    this.position += buffer.length + 1;
  }

  writeString16(value) {
    const buffer = Array.from(Buffer.from(value));
    this.body.push((value >> 8) & 0xFF);
    this.body.push(value & 0xFF);
    this.body = this.body.concat(buffer);
    this.position += buffer.length + 2;
  }
}

