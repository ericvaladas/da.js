import md5 from 'md5';
import { uint8, uint16, int32 } from './datatypes';
import { random } from './util';


function isSpecialEncryptOpcode(opcode) {
  switch (opcode) {
    case 0x00:
    case 0x10:
    case 0x48:
    case 0x02:
    case 0x03:
    case 0x04:
    case 0x0B:
    case 0x26:
    case 0x2D:
    case 0x3A:
    case 0x42:
    case 0x43:
    case 0x4B:
    case 0x57:
    case 0x62:
    case 0x68:
    case 0x71:
    case 0x73:
    case 0x7B:
      return false;
  }
  return true;
}

function isSpecialDecryptOpcode(opcode) {
  switch (opcode) {
    case 0x00:
    case 0x03:
    case 0x40:
    case 0x7E:
    case 0x01:
    case 0x02:
    case 0x0A:
    case 0x56:
    case 0x60:
    case 0x62:
    case 0x66:
    case 0x6F:
      return false;
  }
  return true;
}

function isEncryptOpcode(opcode) {
  switch (opcode) {
    case 0x00:
    case 0x10:
    case 0x48:
      return false;
  }
  return true;
}

function isDecryptOpcode(opcode) {
  switch (opcode) {
    case 0x00:
    case 0x03:
    case 0x40:
    case 0x7E:
      return false;
  }
  return true;
}

class Crypto {
  constructor(seed, key, name) {
    this.seed = seed || 0;
    this.key = key || 'UrkcnItnI';
    this.name = name;
    this.generateSalt();
    this.generateSpecialKeyTable();
  }

  encrypt(packet) {
    if (!isEncryptOpcode(packet.opcode)) {
      return;
    }

    const specialKeySeed = random(0xFFFF);
    const specialEncrypt = isSpecialEncryptOpcode(packet.opcode);
    let a = uint16(uint16(specialKeySeed) % 65277 + 256);
    let b = uint8(((specialKeySeed & 0xFF0000) >> 16) % 155 + 100);
    const key = specialEncrypt ? this.generateSpecialKey(a, b) : Buffer.from(this.key);

    packet.body.push(0);

    if (specialEncrypt) {
      packet.body.push(packet.opcode);
    }

    packet.body = this.transform(packet.body, key, packet.sequence);

    let hash = md5([packet.opcode, packet.sequence].concat(packet.body));
    hash = Buffer.from(hash, 'hex');

    packet.body.push(hash[13], hash[3], hash[11], hash[7]);

    a ^= 0x7470;
    b ^= 0x23;

    packet.body.push(uint8(a), b, uint8(a >> 8));
    packet.body.unshift(packet.sequence);
  }

  decrypt(packet) {
    if (!isDecryptOpcode(packet.opcode)) {
      return;
    }

    packet.sequence = packet.body.shift();

    const specialEncrypt = isSpecialDecryptOpcode(packet.opcode);
    const a = uint16(packet.body[packet.body.length - 1] << 8 | packet.body[packet.body.length - 3]) ^ 0x6474;
    const b = packet.body[packet.body.length - 2] ^ 0x24;
    const key = specialEncrypt ? this.generateSpecialKey(a, b) : Buffer.from(this.key);

    packet.body = packet.body.slice(0, packet.body.length - 3);
    packet.body = this.transform(packet.body, key, packet.sequence);
  }

  transform(buffer, key, sequence) {
    return buffer.map((byte, i) => {
      byte ^= this.salt[sequence] ^ key[i % key.length];
      const saltIndex = int32(i / key.length) % this.salt.length;
      if (saltIndex !== sequence) {
        byte ^= this.salt[saltIndex];
      }
      return byte;
    });
  }

  generateSalt() {
    this.salt = new Array(256).fill().map((v, i) => {
      let saltByte;
      switch (this.seed) {
        case 0:
          saltByte = i;
          break;
        case 1:
          saltByte = (i % 2 !== 0 ? -1 : 1) * ((i + 1) / 2) + 128;
          break;
        case 2:
          saltByte = 255 - i;
          break;
        case 3:
          saltByte = (i % 2 !== 0 ? -1 : 1) * ((255 - i) / 2) + 128;
          break;
        case 4:
          saltByte = uint8(i / 16) * uint8(i / 16);
          break;
        case 5:
          saltByte = 2 * i % 256;
          break;
        case 6:
          saltByte = 255 - 2 * i % 256;
          break;
        case 7:
          saltByte = i > 127 ? 2 * i - 256 : 255 - 2 * i;
          break;
        case 8:
          saltByte = i > 127 ? 511 - 2 * i : 2 * i;
          break;
        case 9:
          saltByte = uint8(255 - uint8((i - 128) / 8) * uint8((i - 128) / 8) % 256);
          break;
      }
      return uint8(saltByte | (saltByte << 8) | ((saltByte | (saltByte << 8)) << 16));
    });
  }

  generateSpecialKey(a, b) {
    return new Array(this.key.length).fill().map((v, i) => {
      const index = (i * (this.key.length * i + b * b) + a) % this.specialKeyTable.length;
      return this.specialKeyTable[index];
    });
  }

  generateSpecialKeyTable() {
    if (this.name) {
      let keyTable = md5(md5(this.name));
      for (let i = 0; i < 31; i++) {
        keyTable += md5(keyTable);
      }
      this.specialKeyTable = Buffer.from(keyTable);
    }
  }
}

export default Crypto;
export { isSpecialEncryptOpcode, isSpecialDecryptOpcode };
export { isEncryptOpcode, isDecryptOpcode };
