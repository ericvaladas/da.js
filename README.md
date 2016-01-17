# da.js
A Dark Ages client written in Javascript

### Setup
Clone this repository.
```sh
git clone https://github.com/ericvaladas/da.js.git
```
Load this repository as an _unpacked extension_ in Google Chrome.
Go to `chrome://extensions/` and enable Developer mode to load the extension.

### Usage
Launch the da.js chrome app, open the inspector, and play around in the console
```js
var client = new Client("username", "password")
client.connect()
```
