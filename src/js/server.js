function Server(address, port, name) {
  this.address = address;
  this.port = port;
  this.name = name;
}

Object.assign(Server.prototype, {
  fromIPAddress: function(address, port) {
    var endPoint = `${address}:${port}`;
    switch (endPoint) {
      case LoginServer.endPoint(): return LoginServer;
      case TemuairServer.endPoint(): return TemuairServer;
      case MedeniaServer.endPoint(): return MedeniaServer;
    }
  },

  endPoint: function() {
    return `${this.address}:${this.port}`;
  }
});


var LoginServer = new Server('52.88.55.94', 2610, "Login Server");
var TemuairServer = new Server('52.88.55.94', 2611, "Temuair Server");
var MedeniaServer = new Server('52.88.55.94', 2612, "Medenia Server");
