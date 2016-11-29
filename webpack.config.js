module.exports = {
  entry: "./src/js/client.js",
  output: {
    filename: "./build/da.js"
  },
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader'
    }]
  }
};
