module.exports = {
  entry: "app.js",
  output: {
    path: "./build",
    filename: "bundle.js",
  },
  module: {
    loaders: [
      { test: /\.js$/,        loader: 'jsx-loader?harmony'      }, // loaders can take parameters as a querystring
      { test: /\.css$/,       loader: 'style-loader!css-loader' },
    ]
  },
  resolve: {
    // you can now require('file') instead of require('file.coffee')
    extensions: ['', '.js'],
  },
};
