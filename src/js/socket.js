function Socket() {
  chrome.sockets.tcp.onReceiveError.addListener(function(error) {
    console.log(error);
  });
}

Object.assign(Socket.prototype, {
  connect: function(ipAddress, port, callback) {
    callback = callback ? callback : function() {};
    var _socket = this;
    chrome.sockets.tcp.create(function(socket) {
      _socket.socketId = socket.socketId;
      chrome.sockets.tcp.connect(_socket.socketId, ipAddress, port, callback);
    });
  },

  disconnect: function(callback) {
    callback = callback ? callback : function() {};
    var _socket = this;
    chrome.sockets.tcp.disconnect(_socket.socketId, function() {
      chrome.sockets.tcp.close(_socket.socketId, callback);
    });
  },

  receive: function(callback) {
    var _socket = this;
    chrome.sockets.tcp.onReceive.addListener(function(info) {
      if (info.socketId == _socket.socketId) {
        callback(new Uint8Array(info.data));
      }
    });
  },

  send: function(data, callback) {
    if (this.socketId) {
      callback = callback ? callback : function() {};
      chrome.sockets.tcp.send(this.socketId, data, callback);
    }
  }
});

