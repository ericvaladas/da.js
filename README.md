# darkages
A Dark Ages client for Node.js applications.

## Installation
```
npm install darkages
```

## Usage

### ES6
```js
import { Client } from 'darkages';

const client = new Client('username', 'password');
client.connect();
```


### CommonJS
```js
const Darkages = require('darkages');

const client = new Darkages.Client('username', 'password');
client.connect();
```

### Example
```js
const client = new Client('username', 'password');

client.events.on(0x0A, packet => {
  const channel = packet.readByte();
  const message = packet.readString16();
  const [ name, whisper ] = message.split('" ');

  if (whisper === 'ping') {
    const response = new Packet(0x19);
    response.writeString8(name);
    response.writeString8('pong');
    client.send(response);
  }
});

client.connect();
```


