const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/stimulus.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, '_site'),
  },
};