function random(max) {
  return Math.floor(Math.random() * max);
}

function getBytes(value) {
  var bytes = [];
  for (var i = 0; i < value.length; i++) {
    bytes.push(value.charCodeAt(i));
  }
  return bytes;
}

function hexToBytes(hex) {
  var bytes = [];
  for (var i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return bytes;
}


