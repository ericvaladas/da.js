function Socket() {
  var _socket = this

  chrome.sockets.tcp.onReceiveError.addListener(function(error) {
    console.log(error)
    _socket.disconnect()
  })

  this.connect = function(ipAddress, port, callback) {
    if (callback == undefined) { callback = function() {} }

    chrome.sockets.tcp.create(function(socket) {
      _socket.socketId = socket.socketId
      chrome.sockets.tcp.connect(_socket.socketId, ipAddress, port, callback)
    })
  }

  this.disconnect = function(callback) {
    if (callback == undefined) { callback = function() {} }
    chrome.sockets.tcp.disconnect(_socket.socketId, function() {
      chrome.sockets.tcp.close(_socket.socketId, callback)
    })
  }

  this.receive = function(callback) {
    chrome.sockets.tcp.onReceive.addListener(function(info) {
      if (info.socketId == _socket.socketId) {
        callback(info.data)
      }
    })
  }

  this.send = function(data, callback) {
    if (_socket.socketId != undefined) {
      if (callback == undefined) { callback = function() {} }
      chrome.sockets.tcp.send(_socket.socketId, data, callback)
    }
  }
}

