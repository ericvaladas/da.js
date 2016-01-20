function Socket() {
  this.listeners = []

  chrome.sockets.tcp.onReceiveError.addListener(function(error) {
    console.log(error);
  });
}

Object.assign(Socket.prototype, {
  connect: function(ipAddress, port, callback) {
    callback = callback ? callback : function() {};
    chrome.sockets.tcp.create(function(socket) {
      this.socketId = socket.socketId;
      chrome.sockets.tcp.connect(this.socketId, ipAddress, port, callback);
    }.bind(this));
  },

  disconnect: function(callback) {
    callback = callback ? callback : function() {};
    this.removeListeners();
    chrome.sockets.tcp.disconnect(this.socketId, function() {
      chrome.sockets.tcp.close(this.socketId, callback);
    }.bind(this));
  },

  removeListeners: function() {
    for (var i in this.listeners) {
      chrome.sockets.tcp.onReceive.removeListener(this.listeners.pop())
    }
  },

  receive: function(callback) {
    var listener = function(info) {
      callback(new Uint8Array(info.data));
    };
    this.listeners.push(listener)
    chrome.sockets.tcp.onReceive.addListener(listener);
  },

  send: function(data, callback) {
    if (this.socketId) {
      callback = callback ? callback : function() {};
      chrome.sockets.tcp.send(this.socketId, data, callback);
    }
  }
});

