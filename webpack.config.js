// Generated using webpack-cli https://github.com/webpack/webpack-cli
const path = require('path');

const isProduction = process.env.NODE_ENV == "production";

const config = {
  entry: "./src/stimulus.ts",
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, "./_site"),
  },
  plugins: [],
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/i,
        loader: "ts-loader",
        exclude: ["/node_modules/"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", "..."],
  },
};

module.exports = () => {
  config.mode = isProduction ? "production" : "development";
  //config.devtools = isProduction ? "none" : "eval-source-map";
  return config;
};