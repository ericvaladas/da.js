import md5 from 'md5';
import {uint8, uint16, int32} from './datatypes';
import {random} from './util';


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

function Crypto(seed, key, name) {
  this.seed = seed || 0;
  this.key = key || 'UrkcnItnI';
  this.name = name;
  this.generateSalt();
  this.generateSpecialKeyTable();
}

Object.assign(Crypto.prototype, {
  encrypt(packet) {
    if (!isEncryptOpcode(packet.opcode)) {
      return;
    }

    let specialKeySeed = random(0xFFFF);
    let specialEncrypt = isSpecialEncryptOpcode(packet.opcode);
    let a = uint16(uint16(specialKeySeed) % 65277 + 256);
    let b = uint8(((specialKeySeed & 0xFF0000) >> 16) % 155 + 100);

    packet.body.push(0);

    if (specialEncrypt) {
      let specialKey = this.generateSpecialKey(a, b);
      packet.body.push(packet.opcode);
      packet.body = this.transform(packet.body, specialKey, packet.sequence);
    }
    else {
      let basicKey = new Buffer(this.key);
      packet.body = this.transform(packet.body, basicKey, packet.sequence);
    }

    let hash = md5([packet.opcode, packet.sequence].concat(packet.body));
    hash = new Buffer(hash, 'hex');

    packet.body.push(hash[13]);
    packet.body.push(hash[3]);
    packet.body.push(hash[11]);
    packet.body.push(hash[7]);

    a ^= 0x7470;
    b ^= 0x23;

    packet.body.push(uint8(a));
    packet.body.push(b);
    packet.body.push(uint8(a >> 8));

    packet.body.unshift(packet.sequence);
  },

  decrypt(packet) {
    if (!isDecryptOpcode(packet.opcode)) {
      packet.body.shift();
      return;
    }

    packet.body.shift();
    packet.sequence = packet.body.shift();
    packet.body = packet.body.slice(0, packet.body.length - 3);

    if (isSpecialDecryptOpcode(packet.opcode)) {
      let a = uint16(packet.body[packet.body.length - 1] << 8 | packet.body[packet.body.length - 3]) ^ 0x6474;
      let b = packet.body[packet.body.length - 2] ^ 0x24;
      let specialKey = this.generateSpecialKey(a, b);
      packet.body = this.transform(packet.body, specialKey, packet.sequence);
    }
    else {
      let basicKey = new Buffer(this.key);
      packet.body = this.transform(packet.body, basicKey, packet.sequence);
    }
  },

  transform(buffer, key, sequence) {
    return buffer.map((byte, i) => {
      byte ^= this.salt[sequence];
      byte ^= key[i % 9];
      let saltIndex = int32((i / 9) % 256);
      if (saltIndex !== sequence) {
        byte ^= this.salt[saltIndex];
      }
      return byte;
    });
  },

  generateSalt() {
    let salt = [];
    let saltByte = 0;
    for (let i = 0; i < 256; ++i) {
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
          saltByte = i / 16 * (i / 16);
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
          saltByte = 255 - (i - 128) / 8 * ((i - 128) / 8) % 256;
          break;
      }
      saltByte |= (saltByte << 8) | ((saltByte | (saltByte << 8)) << 16);
      salt[i] = uint8(saltByte);
    }
    this.salt = salt;
  },

  generateSpecialKey(a, b) {
    let specialKey = [];
    for (let i = 0; i < 9; ++i) {
      specialKey[i] = this.specialKeyTable[(i * (9 * i + b * b) + a) % 1024];
    }
    return specialKey;
  },

  generateSpecialKeyTable() {
    if (this.name) {
      let keyTable = md5(md5(this.name));
      for (let i = 0; i < 31; ++i) {
        keyTable += md5(keyTable);
      }
      this.specialKeyTable = new Buffer(keyTable);
    }
  }
});


export {Crypto};
export {isSpecialEncryptOpcode, isSpecialDecryptOpcode};
export {isEncryptOpcode, isDecryptOpcode};
