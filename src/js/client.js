// Implement string format method
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

function Client(username, password) {
  var _client = this
  this.daVersion = 739
  this.username = username
  this.password = password
  this.crypto = new Crypto()
  this.startTime = new Date().getTime()
  this.recvBuffer = []
  this.clientOrdinal = 0
  this.socket = null
  this.server = null
  this.sentVersion = false
  this.showOutgoing = false
  this.showIncoming = false

  this.tickCount = function() {
    return new Date().getTime() - _client.startTime
  }

  this.connect = function(address, port, callback) {
    if (address == undefined) {
      address = LoginServer.address
      port = LoginServer.port
    }

    var server = new ServerInfo().fromIPAddress(address, port)

    console.log("Connecting to {0}...".format(server.name))

    _client.socket = new Socket()
    _client.socket.connect(address, port, function(success) {
      if (success == 0) {
        console.log("Connected.")
        _client.socket.receive(_client.handleRecv)

        if (callback != undefined) {
          callback()
        }
      }
    })

    this.server = server
  }

  this.disconnect = function(callback) {
    if (_client.server) {
      console.log("Disconnected from {0}.".format(_client.server.name))
      _client.server = null
    }
    if (_client.socket) {
      _client.socket.disconnect(callback)
      _client.socket = null
    }
  }

  this.reconnect = function() {
    _client.disconnect(function() {
      _client.clientOrdinal = 0
      _client.sentVersion = false
      _client.connect()
    })
  }

  this.send = function(packet) {
    if (packet.shouldEncrypt()) {
      packet.ordinal = _client.clientOrdinal
      _client.clientOrdinal = uint8(_client.clientOrdinal + 1)
      packet.encrypt(_client.crypto)
    }

    _client.socket.send(packet.toBytearray().buffer, function() {
      if (_client.showOutgoing) {
        console.log("Sent: {0}".format(packet.toString()))
      }
    })
  }

  this.connectedToLogin = function() {
    _client.logIn()
  }

  this.connectedToWorld = function() {
    console.log("Logged into {0} as {1}.".format(_client.server.name, _client.username))
    _client.send(new ClientPacket(0x2D))
  }

  this.logIn = function() {
    console.log("Logging in as {0}... ".format(_client.username))

    var key1 = randomRange(0xFF)
    var key2 = randomRange(0xFF)
    var clientId = randomRange(0xFFFFFFFF)
    var clientIdKey = uint8(key2 + 138)

    var clientIdArray = [
      clientId & 0x0FF,
      (clientId >> 8) & 0x0FF,
      (clientId >> 16) & 0x0FF,
      (clientId >> 24) & 0x0FF
    ]

    var nexonCRC = new NexonCRC16()
    var hash = nexonCRC.calculate(clientIdArray, 0, 4)
    var clientIdChecksum = uint16(hash)
    var clientIdChecksumKey = uint8(key2 + 0x5E)
    clientIdChecksum ^= uint16(clientIdChecksumKey | ((clientIdChecksumKey + 1) << 8))

    clientId ^= uint32(clientIdKey | ((clientIdKey + 1) << 8) | ((clientIdKey + 2) << 16) | ((clientIdKey + 3) << 24))

    var randomValue = randomRange(0xFFFF)
    var randomValueKey = uint8(key2 + 115)
    randomValue ^= uint32(randomValueKey | ((randomValueKey + 1) << 8) | ((randomValueKey + 2) << 16) | ((randomValueKey + 3) << 24))

    var x03 = new ClientPacket(0x03)
    x03.writeString8(_client.username)
    x03.writeString8(_client.password)
    x03.writeByte(key1)
    x03.writeByte(uint8(key2 ^ (key1 + 59)))
    x03.writeUint32(clientId)
    x03.writeUint16(clientIdChecksum)
    x03.writeUint32(randomValue)

    var crc = nexonCRC.calculate(x03.data, _client.username.length + _client.password.length + 2, 12)
    var crcKey = uint8(key2 + 165)
    crc ^= uint16(crcKey | (crcKey + 1) << 8)

    x03.writeUint16(crc)
    x03.writeUint16(0x0100)

    this.send(x03)
  }

  this.packetHandler_0x00_encryption = function(packet) {
    var code = packet.readByte()

    if (code == 1) {
      _client.daVersion -= 1
      console.log("Invalid DA version, possibly too high. Trying again with {0}.".format(_client.daVersion))
      _client.reconnect()
      return
    }
    else if (code == 2) {
      var version = packet.readInt16()
      packet.readByte()
      packet.readString8()  // patch url
      _client.daVersion = version
      console.log("Your DA version is too low. Setting DA version to {0}.".format(version))
      _client.reconnect()
      return
    }

    packet.readUint32()  // server table crc
    var seed = packet.readByte()
    var key = packet.readString8()

    _client.crypto = new Crypto(seed, key)

    var x57 = new ClientPacket(0x57)
    x57.writeUint32(0)
    _client.send(x57)
  }

  this.packetHandler_0x02_loginMessage = function(packet) {
    var code = packet.readByte()
    var message = packet.readString8()

    if (code == 0 || code == 3 || code == 14 || code == 15) {
      // code 0: Success
      // code 3: Invalid name or password
      // code 14: Name does not exist
      // code 15: Incorrect password
    }
    else {
      console.log("Log in failed")
    }
  }

  this.packetHandler_0x03_redirect = function(packet) {
    var address = packet.read(4)
    var port = packet.readUint16()
    packet.readByte()  // remaining
    var seed = packet.readByte()
    var key = packet.readString8()
    var name = packet.readString8()
    var id = packet.readUint32()

    _client.crypto = new Crypto(seed, key, name)

    address.reverse()
    address = address.join('.')

    _client.disconnect(function() {
      _client.connect(address, port, function() {
        var x10 = new ClientPacket(0x10)
        x10.writeByte(seed)
        x10.writeString8(key)
        x10.writeString8(name)
        x10.writeUint32(id)
        x10.writeByte(0x00)
        _client.send(x10)

        if (_client.server == LoginServer) {
          _client.connectedToLogin()
        }
      })
    })
  }

  this.packetHandler_0x05_userId = function(packet) {
    _client.connectedToWorld()
  }

  this.packetHandler_0x0A_systemMessage = function(packet) {
    packet.readByte()
    console.log(packet.readString16())
  }

  this.packetHandler_0x0D_chat = function(packet) {
  }

  this.packetHandler_0x3B_pingA = function(packet) {
    var hiByte = packet.readByte()
    var loByte = packet.readByte()

    var x45 = new ClientPacket(0x45)
    x45.writeByte(loByte)
    x45.writeByte(hiByte)
    _client.send(x45)
  }

  this.packetHandler_0x4C_endingSignal = function(packet) {
    var x0B = new ClientPacket(0x0B)
    x0B.writeBoolean(False)
    _client.send(x0B)
  }

  this.packetHandler_0x68_pingB = function(packet) {
    var timestamp = packet.readInt32()

    var x75 = new ClientPacket(0x75)
    x75.writeInt32(timestamp)
    x75.writeInt32(int32(this.tickCount()))
    _client.send(x75)
  }

  this.packetHandler_0x7E_welome = function(packet) {
    if (this.sentVersion) {
      return
    }

    var x62 = new ClientPacket(0x62)
    x62.writeByte(0x34)
    x62.writeByte(0x00)
    x62.writeByte(0x0A)
    x62.writeByte(0x88)
    x62.writeByte(0x6E)
    x62.writeByte(0x59)
    x62.writeByte(0x59)
    x62.writeByte(0x75)
    _client.send(x62)

    var x00 = new ClientPacket(0x00)
    x00.writeInt16(_client.daVersion)
    x00.writeByte(0x4C)
    x00.writeByte(0x4B)
    x00.writeByte(0x00)
    _client.send(x00)

    _client.sentVersion = true
  }

  this.handleRecv = function(recvBuffer) {
    recvBuffer = new Uint8Array(recvBuffer)

    if (recvBuffer.length == 0) {
      _client.disconnect()
      return
    }

    while (recvBuffer.length > 3) {
      if (recvBuffer[0] != 0xAA) {
        return
      }

      var length = recvBuffer[1] << 8 | recvBuffer[2] + 3

      if (length > recvBuffer.length) {
        break
      }

      var buffer = recvBuffer.slice(0, length)
      recvBuffer = recvBuffer.slice(length)

      var packet = new ServerPacket(buffer)

      if (packet.shouldEncrypt()) {
        packet.decrypt(_client.crypto)
      }

      if (_client.showIncoming) {
        console.log("Received: {0}".format(packet.toString()))
      }

      if (packet.opcode in _client.packetHandlers) {
          _client.packetHandlers[packet.opcode](packet)
      }
    }
  }

  this.packetHandlers = {
    0x00: this.packetHandler_0x00_encryption,
    0x02: this.packetHandler_0x02_loginMessage,
    0x03: this.packetHandler_0x03_redirect,
    0x05: this.packetHandler_0x05_userId,
    0x0A: this.packetHandler_0x0A_systemMessage,
    0x0D: this.packetHandler_0x0D_chat,
    0x3B: this.packetHandler_0x3B_pingA,
    0x4C: this.packetHandler_0x4C_endingSignal,
    0x68: this.packetHandler_0x68_pingB,
    0x7E: this.packetHandler_0x7E_welome
  }
}
