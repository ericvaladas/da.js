import { int32 } from './datatypes';
import { LoginServer } from './server';
import Crypto from './crypto';
import Packet from './packet';


export default {
  encryption(packet, client) {
    let code = packet.readByte();

    if (code === 1) {
      client.appVersion -= 1;
      console.log(`Invalid DA version, possibly too high. Trying again with ${client.appVersion}.`);
      client.reconnect();
      return;
    }
    else if (code === 2) {
      let version = packet.readInt16();
      packet.readByte();
      packet.readString8();  // patch url
      client.appVersion = version;
      console.log(`Your DA version is too low. Setting DA version to ${version}.`);
      client.reconnect();
      return;
    }

    packet.readUInt32();  // server table crc
    const seed = packet.readByte();
    const key = packet.readString8();
    client.crypto = new Crypto(seed, key);

    const x57 = new Packet(0x57);
    x57.writeByte(0);
    x57.writeByte(0);
    x57.writeByte(0);
    client.send(x57);
  },

  loginMessage(packet, client) {
    const code = packet.readByte();
    const message = packet.readString8();

    switch (code) {
      case 0: // Success
        break;
      case 3: // Invalid name or password
      case 14: // Name does not exist
      case 15: // Incorrect password
        console.log(`${message}.`);
        client.disconnect();
        break;
      default:
        console.log(message, `(code ${code})`);
        console.log('Log in failed. Retrying...');
        setTimeout(() => client.reconnect(), 1000)
    }
  },

  redirect(packet, client) {
    let address = packet.read(4);
    const port = packet.readUInt16();
    packet.readByte();  // remaining
    const seed = packet.readByte();
    const key = packet.readString8();
    const name = packet.readString8();
    const id = packet.readUInt32();

    client.crypto = new Crypto(seed, key, name);

    address.reverse();
    address = address.join('.');

    client.reconnect(address, port)
      .then(() => {
        client.confirmIdentity(id)
        if (client.server === LoginServer) {
          client.logIn();
        }
      });
  },

  userId(packet, client) {
    console.log(`Logged into ${client.server.name} as ${client.username}.`);
    client.send(new Packet(0x2D));
  },

  pingA(packet, client) {
    const hiByte = packet.readByte();
    const loByte = packet.readByte();
    const x45 = new Packet(0x45);
    x45.writeByte(loByte);
    x45.writeByte(hiByte);
    client.send(x45);
  },

  pingB(packet, client) {
    const timestamp = packet.readInt32();
    const x75 = new Packet(0x75);
    x75.writeInt32(timestamp);
    x75.writeInt32(int32(client.tickCount()));
    client.send(x75);
  },

  endingSignal(packet, client) {
    const x0B = new Packet(0x0B);
    x0B.writeByte(0x00);
    client.send(x0B);
  },

  welcome(packet, client) {
    if (client.didSendVersion) {
      return;
    }

    const x62 = new Packet(0x62);
    x62.writeByte(0x34);
    x62.writeByte(0x00);
    x62.writeByte(0x0A);
    x62.writeByte(0x88);
    x62.writeByte(0x6E);
    x62.writeByte(0x59);
    x62.writeByte(0x59);
    x62.writeByte(0x75);
    client.send(x62)

    const x00 = new Packet(0x00);
    x00.writeInt16(client.appVersion);
    x00.writeByte(0x4C);
    x00.writeByte(0x4B);
    x00.writeByte(0x00);
    client.send(x00);
    client.didSendVersion = true;
  }
};

