function Socket() {
  this.listeners = []

  chrome.sockets.tcp.onReceiveError.addListener((error) => {
    console.log(error);
  });
}

Object.assign(Socket.prototype, {
  connect(ipAddress, port) {
    return new Promise((resolve) => {
      chrome.sockets.tcp.create((socket) => {
        this.socketId = socket.socketId;
        chrome.sockets.tcp.connect(this.socketId, ipAddress, port, resolve);
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
    this.listeners.forEach((listener) => {
      chrome.sockets.tcp.onReceive.removeListener(listener);
    });
  },

  receive(callback) {
    var listener = (info) => {
      callback(new Uint8Array(info.data));
    };
    this.listeners.push(listener)
    chrome.sockets.tcp.onReceive.addListener(listener);
  },

  send(data) {
    return new Promise((resolve) => {
      if (this.socketId) {
        chrome.sockets.tcp.send(this.socketId, data, resolve);
      }
    });
  }
});

