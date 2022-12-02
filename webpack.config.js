// Generated using webpack-cli https://github.com/webpack/webpack-cli
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlReplaceWebpackPlugin = require('html-replace-webpack-plugin');
const path = require('path');

const isProduction = process.env.NODE_ENV == "production";
const buildTime = Math.floor(Date.now() / 1000);
const prodPlugins = isProduction ? [
  new HtmlWebpackPlugin({
    template: path.resolve(__dirname, "./_site/index.html"),
    inject: false
  }),
  new HtmlReplaceWebpackPlugin([{
    pattern: 'bundle.js',
    replacement: `bundle.${buildTime}.js`
  },{
    pattern: 'styles.css',
    replacement: `styles.${buildTime}.js`
  }])
] : [];

const config = {
  entry: {
    bundle: "./src/stimulus.ts",
    styles: "./css/styles.css"
  },
  output: {
    filename: isProduction ? `[name].${buildTime}.js` : `[name].js`,
    path: path.resolve(__dirname, "./_site"),
  },
  plugins: [...prodPlugins],
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/i,
        loader: "ts-loader",
        exclude: ["/node_modules/"],
      },{
        test: /\.css$/i,
        use: ['css-loader', 'postcss-loader']
      }
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", "..."],
  }
};

module.exports = () => {
  config.mode = isProduction ? "production" : "development";
  //config.devtools = isProduction ? "none" : "eval-source-map";
  return config;
};