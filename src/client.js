const net = require('net');
const EventEmitter = require('events');
import { getServerFromAddress, LoginServer } from './server';
import Crypto, { isEncryptOpcode } from './crypto';
import { uint8, uint16, uint32 } from './datatypes';
import { calculateCRC16 } from './crc';
import { random } from './util';
import Packet from './packet';
import packetHandlers from './packet-handlers';


export default class {
  constructor(username, password) {
    this.appVersion = 741;
    this.username = username;
    this.password = password;
    this.crypto = new Crypto();
    this.startTime = new Date().getTime();
    this.encryptSequence = 0;
    this.didSendVersion = false;
    this.logOutgoing = false;
    this.logIncoming = false;
    this.incomingBuffers = [];
    this.events = new EventEmitter();
    this.events.on(0x00, packetHandlers.encryption)
    this.events.on(0x02, packetHandlers.loginMessage)
    this.events.on(0x03, packetHandlers.redirect)
    this.events.on(0x05, packetHandlers.userId)
    this.events.on(0x3B, packetHandlers.pingA)
    this.events.on(0x4C, packetHandlers.endingSignal)
    this.events.on(0x68, packetHandlers.pingB)
    this.events.on(0x7E, packetHandlers.welcome)
  }

  tickCount() {
    return new Date().getTime() - this.startTime;
  }

  connect(address, port) {
    if (!address) {
      address = LoginServer.address;
      port = LoginServer.port;
    }

    this.server = getServerFromAddress(address, port);
    console.log(`Connecting to ${this.server.name}...`);

    const socket = new net.Socket();
    socket.on('data', this.receive.bind(this));
    socket.on('end', () => setTimeout(this.reconnect.bind(this), 1000));
    socket.on('close', () => this.disconnect(socket));

    return new Promise(resolve => {
      socket.connect(port, address, () => {
        this.socket = socket;
        resolve();
      });
    });
  }

  disconnect(socket=this.socket) {
    socket.destroy();
  }

  reconnect(address, port) {
    this.disconnect();
    this.encryptSequence = 0;
    this.didSendVersion = false;
    return this.connect(address, port);
  }

  confirmIdentity(id) {
    const x10 = new Packet(0x10);
    x10.writeByte(this.crypto.seed);
    x10.writeString8(this.crypto.key);
    x10.writeString8(this.crypto.name);
    x10.writeUInt32(id);
    x10.writeByte(0x00);
    this.send(x10);
  }

  logIn() {
    console.log(`Logging in as ${this.username}...`);

    const key1 = random(0xFF);
    const key2 = random(0xFF);
    let clientId = random(0xFFFFFFFF);
    const clientIdKey = uint8(key2 + 138);

    const clientIdArray = [
      clientId & 0x0FF,
      (clientId >> 8) & 0x0FF,
      (clientId >> 16) & 0x0FF,
      (clientId >> 24) & 0x0FF
    ];

    const hash = calculateCRC16(clientIdArray, 0, 4);
    let clientIdChecksum = uint16(hash);
    const clientIdChecksumKey = uint8(key2 + 0x5E);

    clientIdChecksum ^= uint16(clientIdChecksumKey | ((clientIdChecksumKey + 1) << 8));
    clientId ^= uint32(
      clientIdKey |
      ((clientIdKey + 1) << 8) |
      ((clientIdKey + 2) << 16) |
      ((clientIdKey + 3) << 24)
    );

    let randomValue = random(0xFFFF);
    const randomValueKey = uint8(key2 + 115);
    randomValue ^= uint32(
      randomValueKey |
      ((randomValueKey + 1) << 8) |
      ((randomValueKey + 2) << 16) |
      ((randomValueKey + 3) << 24)
    );

    const x03 = new Packet(0x03);
    x03.writeString8(this.username);
    x03.writeString8(this.password);
    x03.writeByte(key1);
    x03.writeByte(uint8(key2 ^ (key1 + 59)));
    x03.writeUInt32(clientId);
    x03.writeUInt16(clientIdChecksum);
    x03.writeUInt32(randomValue);

    let crc = calculateCRC16(x03.body, this.username.length + this.password.length + 2, 12);
    const crcKey = uint8(key2 + 165);
    crc ^= uint16(crcKey | (crcKey + 1) << 8);

    x03.writeUInt16(crc);
    x03.writeUInt16(0x0100);
    this.send(x03);
  }

  send(packet) {
    if (isEncryptOpcode(packet.opcode)) {
      packet.sequence = this.encryptSequence;
      this.encryptSequence = uint8(this.encryptSequence + 1);
    }

    if (this.logOutgoing) {
      console.log(`Sent: ${packet.toString()}`);
    }

    this.crypto.encrypt(packet);
    this.socket.write(packet.buffer());
  }

  receive(data) {
    this.incomingBuffers.push(data);
    let buffer = Buffer.concat(this.incomingBuffers.splice(0));

    while (buffer.length > 3 && buffer[0] === 0xAA) {
      const length = buffer[1] << 8 | buffer[2] + 3;

      if (length > buffer.length) {
        this.incomingBuffers.push(buffer);
        break;
      }

      const packetBuffer = Array.from(buffer.slice(0, length));
      const packet = new Packet(packetBuffer);
      this.crypto.decrypt(packet);

      if (this.logIncoming) {
        console.log(`Received: ${packet.toString()}`);
      }

      this.events.emit(packet.opcode, packet, this);

      buffer = buffer.slice(length);
    }
  }
}

