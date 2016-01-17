function ServerInfo(address, port, name, friendlyName) {
  var _server = this
  this.address = address
  this.port = port
  this.name = name
  this.friendlyName = friendlyName

  this.fromIPAddress = function(address, port) {
    endPoint = '{0}:{1}'.format(address, port)

    if (endPoint == LoginServer.endPoint()) {
      return LoginServer
    }
    else if (endPoint == TemuairServer.endPoint()) {
      return TemuairServer
    }
    else if (endPoint == MedeniaServer.endPoint()) {
      return MedeniaServer
    }
  }

  this.endPoint = function() {
    return '{0}:{1}'.format(_server.address, _server.port)
  }
}


var LoginServer = new ServerInfo('64.124.47.50', 2610, "Login Server", "Login Server")
var TemuairServer = new ServerInfo('64.124.47.50', 2615, "Temuair Server", "Temuair")
var MedeniaServer = new ServerInfo('64.124.47.50', 2617, "Medenia Server", "Medenia")
