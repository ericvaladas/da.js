function Socket() {
  this.onError = (error) => { console.log(error); };
  chrome.sockets.tcp.onReceiveError.addListener(this.onError);
}

Object.assign(Socket.prototype, {
  connect(ipAddress, port) {
    return new Promise((resolve, reject) => {
      chrome.sockets.tcp.create((socket) => {
        this.socketId = socket.socketId;
        chrome.sockets.tcp.connect(this.socketId, ipAddress, port, (success) => {
          success === 0 ? resolve() : reject();
        });
      });
    });
  },

  disconnect() {
    return new Promise((resolve) => {
      this.removeListeners();
      chrome.sockets.tcp.disconnect(this.socketId, () => {
        chrome.sockets.tcp.close(this.socketId, resolve);
      });
    });
  },

  removeListeners() {
    chrome.sockets.tcp.onReceive.removeListener(this.onReceive);
    chrome.sockets.tcp.onReceiveError.removeListener(this.onError);
  },

  receive(callback) {
    this.onReceive = (info) => {
      callback(new Uint8Array(info.data));
    };
    chrome.sockets.tcp.onReceive.addListener(this.onReceive);
  },

  send(data) {
    return new Promise((resolve, reject) => {
      if (this.socketId) {
        chrome.sockets.tcp.send(this.socketId, data, (result) => {
          result.resultCode === 0 ? resolve() : reject();
        });
      }
    });
  }
});

