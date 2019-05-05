const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin')
const ZipPlugin = require('zip-webpack-plugin');

module.exports = {
  entry: './assets/index.js',
  output: {
    publicPath: './',
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  devtool: false,
  target: 'node',

  resolve: {
    extensions: ['.html', '.js']
  },
  externals: ['bufferutil', 'utf-8-validate'],
  module: {
    rules: [{}]
  },
  plugins: [
    new CopyWebpackPlugin([{
      from: './assets/index.html',
      to: '.'
    }]),
    new CopyWebpackPlugin([{
      from: './model/**/*',
      to: '.',
      flatten: true
    }])
  ]
};
