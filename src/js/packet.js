function randomRange(max) {
  return Math.floor(Math.random() * max);
}

function getBytes(value) {
  var bytes = []
  for (var i = 0; i < value.length; i++) {
    bytes.push(value.charCodeAt(i));
  }

  return bytes
}

function ClientPacket(opcode) {
  var _packet = this
  this.opcode = opcode
  this.ordinal = 0
  this.position = 0
  this.data = []

  this.encryptMethod = function() {
    var noEncrypt = [0x00, 0x10, 0x48]
    var normalEncrypt = [
      0x02, 0x03, 0x04, 0x0B, 0x26, 0x2D, 0x3A, 0x42,
      0x43, 0x4B, 0x57, 0x62, 0x68, 0x71, 0x73, 0x7B
    ]

    if (noEncrypt.indexOf(_packet.opcode) >= 0) {
      return EncryptMethod.NoEncrypt
    }
    else if (normalEncrypt.indexOf(_packet.opcode) >= 0) {
      return EncryptMethod.Normal
    }
    else {
      return EncryptMethod.MD5Key
    }
  }

  this.shouldEncrypt = function() {
    return (_packet.encryptMethod() != EncryptMethod.NoEncrypt)
  }

  this.toArray = function() {
    var extraLength = _packet.shouldEncrypt() ? 5 : 4
    var bufferLength = _packet.data.length + extraLength
    var buffer = []
    buffer.push(0xAA)
    buffer.push(uint8((bufferLength - 3) / 256))
    buffer.push(uint8(bufferLength - 3))
    buffer.push(_packet.opcode)
    if (_packet.shouldEncrypt()) {
      buffer.push(_packet.ordinal)
    }
    buffer = buffer.concat(_packet.data)

    return buffer
  }

  this.toBytearray = function() {
    return new Uint8Array(_packet.toArray())
  }

  this.toString = function() {
    return String.fromCharCode.apply(null, _packet.toArray())
  }

  this.dialog_crc_table = [
    0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50A5, 0x60C6, 0x70E7,
    0x8108, 0x9129, 0xA14A, 0xB16B, 0xC18C, 0xD1AD, 0xE1CE, 0xF1EF,
    0x1231, 0x0210, 0x3273, 0x2252, 0x52B5, 0x4294, 0x72F7, 0x62D6,
    0x9339, 0x8318, 0xB37B, 0xA35A, 0xD3BD, 0xC39C, 0xF3FF, 0xE3DE,
    0x2462, 0x3443, 0x0420, 0x1401, 0x64E6, 0x74C7, 0x44A4, 0x5485,
    0xA56A, 0xB54B, 0x8528, 0x9509, 0xE5EE, 0xF5CF, 0xC5AC, 0xD58D,
    0x3653, 0x2672, 0x1611, 0x0630, 0x76D7, 0x66F6, 0x5695, 0x46B4,
    0xB75B, 0xA77A, 0x9719, 0x8738, 0xF7DF, 0xE7FE, 0xD79D, 0xC7BC,
    0x48C4, 0x58E5, 0x6886, 0x78A7, 0x0840, 0x1861, 0x2802, 0x3823,
    0xC9CC, 0xD9ED, 0xE98E, 0xF9AF, 0x8948, 0x9969, 0xA90A, 0xB92B,
    0x5AF5, 0x4AD4, 0x7AB7, 0x6A96, 0x1A71, 0x0A50, 0x3A33, 0x2A12,
    0xDBFD, 0xCBDC, 0xFBBF, 0xEB9E, 0x9B79, 0x8B58, 0xBB3B, 0xAB1A,
    0x6CA6, 0x7C87, 0x4CE4, 0x5CC5, 0x2C22, 0x3C03, 0x0C60, 0x1C41,
    0xEDAE, 0xFD8F, 0xCDEC, 0xDDCD, 0xAD2A, 0xBD0B, 0x8D68, 0x9D49,
    0x7E97, 0x6EB6, 0x5ED5, 0x4EF4, 0x3E13, 0x2E32, 0x1E51, 0x0E70,
    0xFF9F, 0xEFBE, 0xDFDD, 0xCFFC, 0xBF1B, 0xAF3A, 0x9F59, 0x8F78,
    0x9188, 0x81A9, 0xB1CA, 0xA1EB, 0xD10C, 0xC12D, 0xF14E, 0xE16F,
    0x1080, 0x00A1, 0x30C2, 0x20E3, 0x5004, 0x4025, 0x7046, 0x6067,
    0x83B9, 0x9398, 0xA3FB, 0xB3DA, 0xC33D, 0xD31C, 0xE37F, 0xF35E,
    0x02B1, 0x1290, 0x22F3, 0x32D2, 0x4235, 0x5214, 0x6277, 0x7256,
    0xB5EA, 0xA5CB, 0x95A8, 0x8589, 0xF56E, 0xE54F, 0xD52C, 0xC50D,
    0x34E2, 0x24C3, 0x14A0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
    0xA7DB, 0xB7FA, 0x8799, 0x97B8, 0xE75F, 0xF77E, 0xC71D, 0xD73C,
    0x26D3, 0x36F2, 0x0691, 0x16B0, 0x6657, 0x7676, 0x4615, 0x5634,
    0xD94C, 0xC96D, 0xF90E, 0xE92F, 0x99C8, 0x89E9, 0xB98A, 0xA9AB,
    0x5844, 0x4865, 0x7806, 0x6827, 0x18C0, 0x08E1, 0x3882, 0x28A3,
    0xCB7D, 0xDB5C, 0xEB3F, 0xFB1E, 0x8BF9, 0x9BD8, 0xABBB, 0xBB9A,
    0x4A75, 0x5A54, 0x6A37, 0x7A16, 0x0AF1, 0x1AD0, 0x2AB3, 0x3A92,
    0xFD2E, 0xED0F, 0xDD6C, 0xCD4D, 0xBDAA, 0xAD8B, 0x9DE8, 0x8DC9,
    0x7C26, 0x6C07, 0x5C64, 0x4C45, 0x3CA2, 0x2C83, 0x1CE0, 0x0CC1,
    0xEF1F, 0xFF3E, 0xCF5D, 0xDF7C, 0xAF9B, 0xBFBA, 0x8FD9, 0x9FF8,
    0x6E17, 0x7E36, 0x4E55, 0x5E74, 0x2E93, 0x3EB2, 0x0ED1, 0x1EF0
  ]

  this.write = function(buffer) {
    _packet.data = _packet.data.concat(buffer)
  }

  this.writeByte = function(value) {
    _packet.data.push(uint8(value))
  }

  this.write_sbyte = function(value) {
    _packet.data.push(int8(value))
  }

  this.writeBoolean = function(value) {
    _packet.data.push(value ? 0x01 : 0x00)
  }

  this.writeInt16 = function(value) {
    var value = int16(value)
    _packet.data.push((value >> 8) & 0xFF)
    _packet.data.push(value & 0xFF)
  }

  this.writeUint16 = function(value) {
    var value = uint16(value)
    _packet.data.push((value >> 8) & 0xFF)
    _packet.data.push(value & 0xFF)
  }

  this.writeInt32 = function(value) {
    var value = int32(value)
    _packet.data.push((value >> 24) & 0xFF)
    _packet.data.push((value >> 16) & 0xFF)
    _packet.data.push((value >> 8) & 0xFF)
    _packet.data.push(value & 0xFF)
  }

  this.writeUint32 = function(value) {
    var value = uint32(value)
    _packet.data.push((value >> 24) & 0xFF)
    _packet.data.push((value >> 16) & 0xFF)
    _packet.data.push((value >> 8) & 0xFF)
    _packet.data.push(value & 0xFF)
  }

  this.writeString = function(value) {
    var buffer = getBytes(value)
    _packet.data = _packet.data.concat(buffer)
    _packet.position += buffer.length
  }

  this.writeString8 = function(value) {
    var buffer = getBytes(value)
    _packet.data.push(buffer.length)
    _packet.data = _packet.data.concat(buffer)
    _packet.position += buffer.length + 1
  }

  this.writeString16 = function(value) {
    var buffer = getBytes(value)
    _packet.data.push((value >> 8) & 0xFF)
    _packet.data.push(value & 0xFF)
    _packet.data = _packet.data.concat(buffer)
    _packet.position += buffer.length + 2
  }

  this.encrypt = function(crypto) {
    if (_packet.opcode == 0x39 || _packet.opcode == 0x3A) {
      _packet.encrypt_dialog()
    }

    var key = ''
    _packet.position = _packet.data.length

    var rand16 = randomRange(65277) + 256
    var rand8 = randomRange(155) + 100

    if (_packet.encryptMethod() == EncryptMethod.Normal) {
      _packet.writeByte(0)
      key = crypto.key
    }
    else if (_packet.encryptMethod() == EncryptMethod.MD5Key) {
      _packet.writeByte(0)
      _packet.writeByte(_packet.opcode)
      key = crypto.generateKey(rand16, rand8)
    }
    else {
      return
    }

    var saltIndex = 0

    for (var i = 0; i < _packet.data.length; i++) {
      saltIndex = uint8(i / crypto.key.length) % 256

      _packet.data[i] ^= uint8(crypto.salt()[saltIndex] ^ key[i % key.length].charCodeAt())

      if (saltIndex != _packet.ordinal) {
        _packet.data[i] ^= crypto.salt()[_packet.ordinal]
      }
    }

    _packet.writeByte(uint8(rand16 % 256 ^ 0x70))
    _packet.writeByte(uint8(rand8 ^ 0x23))
    _packet.writeByte(uint8((rand16 >> 8) % 256 ^ 0x74))
  }

  this.generate_dialog_helper = function() {
    var crc = 0

    for (var i = 0; _packet.data.length - 6; i++) {
      crc = _packet.data[6 + i] ^ ((crc << 8) ^ _packet.dialog_crc_table[(crc >> 8)])
    }

    _packet.data[0] = random.randint(0, 255)
    _packet.data[1] = random.randint(0, 255)
    _packet.data[2] = (_packet.data.length - 4) / 256
    _packet.data[3] = (_packet.data.length - 4) % 256
    _packet.data[4] = crc / 256
    _packet.data[5] = crc % 256
  }

  this.encrypt_dialog = function() {
    _packet.data = _packet.data.slice(0, 6).concat(_packet.data.slice(0, _packet.data.length - 6)).concat(_packet.data.slice(6))

    _packet.generate_dialog_helper()

    var length = _packet.data[2] << 8 | _packet.data[3]
    var x_prime = _packet.data[0] - 0x2D
    var x = _packet.data[1] ^ x_prime
    var y = x + 0x72
    var z = x + 0x28
    _packet.data[2] ^= y
    _packet.data[3] ^= (y + 1) % 256
    for (var i = 0; i < length; i++) {
      _packet.data[4 + i] ^= (z + i) % 256
    }
  }
}


function ServerPacket(buffer) {
  var _packet = this
  this.opcode = buffer[3]
  this.position = 0

  this.encryptMethod = function() {
    var noEncrypt = [0x00, 0x03, 0x40, 0x7E]
    var normalEncrypt = [0x01, 0x02, 0x0A, 0x56, 0x60, 0x62, 0x66, 0x6F]

    if (noEncrypt.indexOf(_packet.opcode) >= 0) {
      return EncryptMethod.NoEncrypt
    }
    else if (normalEncrypt.indexOf(_packet.opcode) >= 0) {
      return EncryptMethod.Normal
    }
    else {
      return EncryptMethod.MD5Key
    }
  }

  this.shouldEncrypt = function() {
    return (_packet.encryptMethod() != EncryptMethod.NoEncrypt)
  }

  if (_packet.shouldEncrypt()) {
    _packet.ordinal = buffer[4]
    _packet.data = buffer.slice(5)
  }
  else {
    _packet.data = buffer.slice(4)
  }

  this.toArray = function() {
    var extraLength = _packet.shouldEncrypt() ? 5 : 4
    var bufferLength = _packet.data.length + extraLength
    var buffer = []
    buffer.push(0xAA)
    buffer.push(uint8((bufferLength - 3) / 256))
    buffer.push(uint8(bufferLength - 3))
    buffer.push(_packet.opcode)
    if (_packet.shouldEncrypt()) {
        buffer.push(_packet.ordinal)
    }
    buffer = buffer.concat(_packet.data)

    return buffer
  }

  this.toBytearray = function() {
    return new Uint8Array(_packet.toArray())
  }

  this.toString = function() {
    return String.fromCharCode.apply(null, _packet.toArray())
  }

  this.read = function(length) {
    if (_packet.position + length > _packet.data.length) {
      return 0
    }

    var buffer = _packet.data.slice(_packet.position, length)
    _packet.position += length

    return buffer
  }

  this.readByte = function() {
    if (_packet.position + 1 > _packet.data.length) {
      return 0
    }

    var value = _packet.data[_packet.position]
    _packet.position += 1
    return value
  }

  this.readSbyte = function() {
    if (_packet.position + 1 > _packet.data.length) {
      return 0
    }

    var value = _packet.data[_packet.position]
    _packet.position += 1
    return value
  }

  this.readBoolean = function() {
    if (_packet.position + 1 > _packet.data.length) {
      return False
    }

    var value = _packet.data[_packet.position] != 0
    _packet.position += 1
    return value
  }

  this.readInt16 = function() {
    if (_packet.position + 2 > _packet.data.length) {
      return 0
    }

    var value = _packet.data[_packet.position] << 8 | _packet.data[_packet.position + 1]
    _packet.position += 2

    return value
  }

  this.readUint16 = function() {
    if (_packet.position + 2 > _packet.data.length) {
      return 0
    }

    var value = _packet.data[_packet.position] << 8 | _packet.data[_packet.position + 1]
    _packet.position += 2

    return value
  }

  this.readInt32 = function() {
    if (_packet.position + 4 > _packet.data.length) {
      return 0
    }

    var value = _packet.data[_packet.position] << 24 | _packet.data[_packet.position + 1] << 16 | _packet.data[_packet.position + 2] << 8 | _packet.data[_packet.position + 3]
    _packet.position += 4

    return int32(value)
  }

  this.readUint32 = function() {
    if (_packet.position + 4 > _packet.data.length) {
      return 0
    }

    var value = _packet.data[_packet.position] << 24 | _packet.data[_packet.position + 1] << 16 | _packet.data[_packet.position + 2] << 8 | _packet.data[_packet.position + 3]
    _packet.position += 4

    return value
  }

  this.readString8 = function() {
    if (_packet.position + 1 > _packet.data.length) {
      return ""
    }

    var length = _packet.data[_packet.position]
    var position = _packet.position + 1

    if (position + length > _packet.data.length) {
      return ""
    }

    var buffer = _packet.data.slice(position, position + length)
    _packet.position += length + 1

    return String.fromCharCode.apply(null, buffer)
  }

  this.readString16 = function() {
    if (_packet.position + 2 > _packet.data.length) {
      return ""
    }

    var length = _packet.data[_packet.position] << 8 | _packet.data[_packet.position + 1]
    var position = _packet.position + 2

    if (position + length > _packet.data.length) {
      return ""
    }

    var buffer = _packet.data.slice(position, position + length)
    _packet.position += length + 2

    return String.fromCharCode.apply(null, buffer)
  }

  this.decrypt = function(crypto) {
    var key = ''
    var length = _packet.data.length - 3

    var rand16 = uint16((_packet.data[length + 2] << 8 | _packet.data[length]) ^ 0x6474)
    var rand8 = uint8(_packet.data[length + 1] ^ 0x24)

    if (_packet.encryptMethod() == EncryptMethod.Normal) {
      key = crypto.key
    }
    else if (_packet.encryptMethod() == EncryptMethod.MD5Key) {
      key = crypto.generateKey(rand16, rand8)
    }
    else {
      return
    }

    var saltIndex = 0

    for (var i = 0; i < length; i++) {
      saltIndex = uint8((i / crypto.key.length) % 256)

      _packet.data[i] ^= uint8(crypto.salt()[saltIndex] ^ key[i % key.length].charCodeAt())

      if (saltIndex != _packet.ordinal) {
        _packet.data[i] ^= crypto.salt()[_packet.ordinal]
      }
    }

    this.data = _packet.data.slice(0, length)
  }
}

EncryptMethod = {
  NoEncrypt: 0,
  Normal: 1,
  MD5Key: 2
}
