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


