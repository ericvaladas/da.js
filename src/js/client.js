import Socket from './socket';
import {Server, LoginServer} from './server';
import {Crypto, isEncryptOpcode} from './crypto';
import {uint8, uint16, uint32, int32} from './datatypes';
import {calculateCRC16} from './crc';
import {random} from './util';
import {ClientPacket, ServerPacket} from './packet';


function Client(username, password) {
  this.clientVersion = 741;
  this.username = username;
  this.password = password;
  this.crypto = new Crypto();
  this.startTime = new Date().getTime();
  this.encryptSequence = 0;
  this.sentVersion = false;
  this.logOutgoing = false;
  this.logIncoming = false;

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
  };
}

Object.assign(Client.prototype, {
  tickCount() {
    return new Date().getTime() - this.startTime;
  },

  connect(address, port) {
    if (!address) {
      address = LoginServer.address;
      port = LoginServer.port;
    }

    let server = new Server().fromIPAddress(address, port);
    console.log(`Connecting to ${server.name}...`);

    this.socket = new Socket();
    return this.socket.connect(address, port)
      .then(() => {
        console.log('Connected.');
        this.server = server;
        this.socket.receive(this.receive.bind(this));
      });
  },

  disconnect() {
    if (this.server) {
      console.log(`Disconnected from ${this.server.name}.`);
    }
    if (this.socket) {
      return this.socket.disconnect();
    }
  },

  reconnect(address, port) {
    return this.disconnect()
      .then(() => {
        this.encryptSequence = 0;
        this.sentVersion = false;
        return this.connect(address, port);
      });
  },

  send(packet) {
    if (isEncryptOpcode(packet.opcode)) {
      packet.sequence = this.encryptSequence;
      this.encryptSequence = uint8(this.encryptSequence + 1);
    }

    if (this.logOutgoing) {
      console.log(`Sent: ${packet.toString()}`);
    }

    this.crypto.encrypt(packet);
    return this.socket.send(packet.buffer());
  },

  confirmIdentity(id) {
    let x10 = new ClientPacket(0x10);
    x10.writeByte(this.crypto.seed);
    x10.writeString8(this.crypto.key);
    x10.writeString8(this.crypto.name);
    x10.writeUint32(id);
    x10.writeByte(0x00);
    return this.send(x10);
  },

  logIn() {
    console.log(`Logging in as ${this.username}...`);

    let key1 = random(0xFF);
    let key2 = random(0xFF);
    let clientId = random(0xFFFFFFFF);
    let clientIdKey = uint8(key2 + 138);

    let clientIdArray = [
      clientId & 0x0FF,
      (clientId >> 8) & 0x0FF,
      (clientId >> 16) & 0x0FF,
      (clientId >> 24) & 0x0FF
    ];

    let hash = calculateCRC16(clientIdArray, 0, 4);
    let clientIdChecksum = uint16(hash);
    let clientIdChecksumKey = uint8(key2 + 0x5E);

    clientIdChecksum ^= uint16(clientIdChecksumKey | ((clientIdChecksumKey + 1) << 8));
    clientId ^= uint32(
      clientIdKey |
      ((clientIdKey + 1) << 8) |
      ((clientIdKey + 2) << 16) |
      ((clientIdKey + 3) << 24)
    );

    let randomValue = random(0xFFFF);
    let randomValueKey = uint8(key2 + 115);
    randomValue ^= uint32(
      randomValueKey |
      ((randomValueKey + 1) << 8) |
      ((randomValueKey + 2) << 16) |
      ((randomValueKey + 3) << 24)
    );

    let x03 = new ClientPacket(0x03);
    x03.writeString8(this.username);
    x03.writeString8(this.password);
    x03.writeByte(key1);
    x03.writeByte(uint8(key2 ^ (key1 + 59)));
    x03.writeUint32(clientId);
    x03.writeUint16(clientIdChecksum);
    x03.writeUint32(randomValue);

    let crc = calculateCRC16(x03.body, this.username.length + this.password.length + 2, 12);
    let crcKey = uint8(key2 + 165);
    crc ^= uint16(crcKey | (crcKey + 1) << 8);

    x03.writeUint16(crc);
    x03.writeUint16(0x0100);
    this.send(x03);
  },

  packetHandler_0x00_encryption(packet) {
    let code = packet.readByte();

    if (code === 1) {
      this.clientVersion -= 1;
      console.log(`Invalid DA version, possibly too high. Trying again with ${this.clientVersion}.`);
      this.reconnect();
      return;
    }
    else if (code === 2) {
      let version = packet.readInt16();
      packet.readByte();
      packet.readString8();  // patch url
      this.clientVersion = version;
      console.log(`Your DA version is too low. Setting DA version to ${version}.`);
      this.reconnect();
      return;
    }

    packet.readUint32();  // server table crc
    let seed = packet.readByte();
    let key = packet.readString8();
    this.crypto = new Crypto(seed, key);

    let x57 = new ClientPacket(0x57);
    x57.writeByte(0);
    x57.writeByte(0);
    x57.writeByte(0);
    this.send(x57);
  },

  packetHandler_0x02_loginMessage(packet) {
    let code = packet.readByte();
    let message = packet.readString8();

    switch (code) {
      case 0: // Success
      case 3: // Invalid name or password
      case 14: // Name does not exist
      case 15: // Incorrect password
        console.log(message);
        break;
      default:
        console.log('Log in failed');
    }
  },

  packetHandler_0x03_redirect(packet) {
    let address = packet.read(4);
    let port = packet.readUint16();
    packet.readByte();  // remaining
    let seed = packet.readByte();
    let key = packet.readString8();
    let name = packet.readString8();
    let id = packet.readUint32();

    this.crypto = new Crypto(seed, key, name);

    address.reverse();
    address = address.join('.');

    this.reconnect(address, port)
      .then(() => { return this.confirmIdentity(id); })
      .then(() => {
        if (this.server === LoginServer) {
          this.logIn();
        }
      });
  },

  packetHandler_0x05_userId() {
    // TODO: Does this ID get used later to confirm identity?
    console.log(`Logged into ${this.server.name} as ${this.username}.`);
    this.send(new ClientPacket(0x2D));
  },

  packetHandler_0x0A_systemMessage(packet) {
    packet.readByte();
    let message = packet.readString16();
    console.log(message);
  },

  packetHandler_0x0D_chat() {
    // TODO
  },

  say(message) {
    let x0E = new ClientPacket(0x0E);
    x0E.writeBoolean(false);
    x0E.writeString8(message);
    this.send(x0E);
  },


  packetHandler_0x3B_pingA(packet) {
    let hiByte = packet.readByte();
    let loByte = packet.readByte();
    let x45 = new ClientPacket(0x45);
    x45.writeByte(loByte);
    x45.writeByte(hiByte);
    this.send(x45);
  },

  packetHandler_0x4C_endingSignal() {
    // TODO: does this handler ever get called?
    let x0B = new ClientPacket(0x0B);
    x0B.writeBoolean(false);
    this.send(x0B);
  },

  packetHandler_0x68_pingB(packet) {
    let timestamp = packet.readInt32();
    let x75 = new ClientPacket(0x75);
    x75.writeInt32(timestamp);
    x75.writeInt32(int32(this.tickCount()));
    this.send(x75);
  },

  packetHandler_0x7E_welome() {
    // TODO: Is there anything in this packet I should be capturing?
    if (this.sentVersion) {
      return;
    }

    let x62 = new ClientPacket(0x62);
    x62.writeByte(0x34);
    x62.writeByte(0x00);
    x62.writeByte(0x0A);
    x62.writeByte(0x88);
    x62.writeByte(0x6E);
    x62.writeByte(0x59);
    x62.writeByte(0x59);
    x62.writeByte(0x75);
    this.send(x62)
      .then(() => {
        let x00 = new ClientPacket(0x00);
        x00.writeInt16(this.clientVersion);
        x00.writeByte(0x4C);
        x00.writeByte(0x4B);
        x00.writeByte(0x00);
        this.send(x00);
        this.sentVersion = true;
      });
  },

  receive(buffer) {
    if (!buffer) {
      this.disconnect();
      return;
    }

    while (buffer.length > 3 && buffer[0] === 0xAA) {
      let length = buffer[1] << 8 | buffer[2] + 3;

      if (length > buffer.length) {
        break;
      }

      let packetBuffer = Array.from(buffer.slice(0, length));
      let packet = new ServerPacket(packetBuffer);
      this.crypto.decrypt(packet);

      if (this.logIncoming) {
        console.log(`Received: ${packet.toString()}`);
      }

      if (packet.opcode in this.packetHandlers) {
        this.packetHandlers[packet.opcode].call(this, packet);
      }

      buffer = buffer.slice(length);
    }
  }
});


window.Client = Client;
