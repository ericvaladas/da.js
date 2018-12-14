# darkages-client
A Dark Ages client for Node.js applications.

## Installation
```
npm install darkages-client
```

## Usage

### ES6
```js
import { Client } from 'darkages-client';

const client = new Client('username', 'password');
client.connect();
```


### CommonJS
```js
const Darkages = require('darkages-client');

const client = new Darkages.Client('username', 'password');
client.connect();
```


