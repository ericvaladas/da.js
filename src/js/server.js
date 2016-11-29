function Server(address, port, name) {
  this.address = address;
  this.port = port;
  this.name = name;
}

let LoginServer = new Server('52.88.55.94', 2610, 'Login Server');
let TemuairServer = new Server('52.88.55.94', 2611, 'Temuair Server');
let MedeniaServer = new Server('52.88.55.94', 2612, 'Medenia Server');

Object.assign(Server.prototype, {
  fromIPAddress(address, port) {
    let endPoint = `${address}:${port}`;
    switch (endPoint) {
      case LoginServer.endPoint(): return LoginServer;
      case TemuairServer.endPoint(): return TemuairServer;
      case MedeniaServer.endPoint(): return MedeniaServer;
    }
  },

  endPoint() {
    return `${this.address}:${this.port}`;
  }
});


export {Server, LoginServer, TemuairServer, MedeniaServer};
