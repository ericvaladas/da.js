function Crypto(seed, key, name) {
  this.seed = seed || 0;
  this.key = key || 'UrkcnItnI';
  this.name = name;
  this.generateSalt();
  this.generateSpecialKeyTable();
}

Object.assign(Crypto.prototype, {
  encrypt: function(packet) {
    if (!isEncryptOpcode(packet.opcode)) {
      return;
    }

    var specialKeySeed = random(0xFFFF);
    var specialEncrypt = isSpecialEncryptOpcode(packet.opcode);
    var a = uint16(uint16(specialKeySeed) % 65277 + 256);
    var b = uint8(((specialKeySeed & 0xFF0000) >> 16) % 155 + 100);

    packet.body.push(0);

    if (specialEncrypt) {
      var specialKey = this.generateSpecialKey(a, b);
      packet.body.push(packet.opcode);
      packet.body = this.transform(packet.body, specialKey, packet.sequence);
    }
    else {
      var basicKey = getBytes(this.key);
      packet.body = this.transform(packet.body, basicKey, packet.sequence);
    }

    var hash = hexToBytes(md5([packet.opcode, packet.sequence].concat(packet.body)));

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

  decrypt: function(packet) {
    if (!isDecryptOpcode(packet.opcode)) {
      packet.body.shift();
      return;
    }

    packet.body.shift();
    packet.sequence = packet.body.shift();
    packet.body = packet.body.slice(0, packet.body.length - 3);

    if (isSpecialDecryptOpcode(packet.opcode)) {
      var a = uint16(packet.body[packet.body.length - 1] << 8 | packet.body[packet.body.length - 3]) ^ 0x6474;
      var b = packet.body[packet.body.length - 2] ^ 0x24;
      var specialKey = this.generateSpecialKey(a, b);
      packet.body = this.transform(packet.body, specialKey, packet.sequence);
    }
    else {
      var basicKey = getBytes(this.key);
      packet.body = this.transform(packet.body, basicKey, packet.sequence);
    }
  },

  transform: function(buffer, key, sequence) {
    return buffer.map(function(byte, i) {
      byte ^= this.salt[sequence];
      byte ^= key[i % 9];
      var saltIndex = int32((i / 9) % 256);
      if (saltIndex != sequence) {
        byte ^= this.salt[saltIndex];
      }
      return byte;
    });
  },

  generateSalt: function() {
    salt = [];
    var saltByte = 0;
    for (var i = 0; i < 256; ++i) {
      switch (this.seed) {
        case 0:
          saltByte = i;
          break;
        case 1:
          saltByte = (i % 2 != 0 ? -1 : 1) * ((i + 1) / 2) + 128;
          break;
        case 2:
          saltByte = 255 - i;
          break;
        case 3:
          saltByte = (i % 2 != 0 ? -1 : 1) * ((255 - i) / 2) + 128;
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

  generateSpecialKey: function(a, b) {
    var specialKey = [];
    for (var i = 0; i < 9; ++i) {
      specialKey[i] = this.specialKeyTable[(i * (9 * i + b * b) + a) % 1024];
    }
    return specialKey;
  },

  generateSpecialKeyTable: function() {
    if (this.name) {
      var keyTable = md5(md5(this.name));
      for (var i = 0; i < 31; ++i) {
        keyTable += md5(keyTable);
      }
      this.specialKeyTable = getBytes(keyTable);
    }
  }
});

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
