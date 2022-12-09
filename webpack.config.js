// Generated using webpack-cli https://github.com/webpack/webpack-cli
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlReplaceWebpackPlugin = require('html-replace-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

let isProduction = process.env.NODE_ENV == "production";
const buildTime = Math.floor(Date.now() / 1000);

// This only works for the first layout, it does not work for remaining pages
isProduction = false;
// Remove after fixed

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
    replacement: `styles.${buildTime}.css`
  }])
] : [];

const config = {
  entry: ["./src/stimulus.ts", "./css/styles.css"],
  output: {
    filename: isProduction ? `bundle.${buildTime}.js` : `bundle.js`,
    path: path.resolve(__dirname, "./_site"),
  },
  plugins: [
    ...prodPlugins,
    new MiniCssExtractPlugin({
      filename: isProduction ? `styles.${buildTime}.css` : `styles.css`,
  }),],
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/i,
        loader: "ts-loader",
        exclude: ["/node_modules/"],
      },{
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader']
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