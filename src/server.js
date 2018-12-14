class Server {
  constructor(address, port, name) {
    this.address = address;
    this.port = port;
    this.name = name;
  }

  endPoint() {
    return `${this.address}:${this.port}`;
  }
}

function getServerFromAddress(address, port) {
  const endPoint = `${address}:${port}`;
  switch (endPoint) {
    case LoginServer.endPoint(): return LoginServer;
    case TemuairServer.endPoint(): return TemuairServer;
    case MedeniaServer.endPoint(): return MedeniaServer;
  }
}

const address = '52.88.55.94';
const LoginServer = new Server(address, 2610, 'Login Server');
const TemuairServer = new Server(address, 2611, 'Temuair Server');
const MedeniaServer = new Server(address, 2612, 'Medenia Server');

export {getServerFromAddress, LoginServer, TemuairServer, MedeniaServer};
