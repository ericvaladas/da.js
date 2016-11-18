function ServerInfo(address, port, name) {
  this.address = address;
  this.port = port;
  this.name = name;
}

Object.assign(ServerInfo.prototype, {
  fromIPAddress: function(address, port) {
    var endPoint = "{0}:{1}".format(address, port);
    switch (endPoint) {
      case LoginServer.endPoint(): return LoginServer;
      case TemuairServer.endPoint(): return TemuairServer;
      case MedeniaServer.endPoint(): return MedeniaServer;
    }
  },

  endPoint: function() {
    return "{0}:{1}".format(this.address, this.port);
  }
});


var LoginServer = new ServerInfo('52.88.55.94', 2610, "Login Server");
var TemuairServer = new ServerInfo('52.88.55.94', 2611, "Temuair Server");
var MedeniaServer = new ServerInfo('52.88.55.94', 2612, "Medenia Server");
