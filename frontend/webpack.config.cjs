const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const backendTarget = process.env.BACKEND_TARGET || "http://backend:4000";

module.exports = {
  entry: "./src/main.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "assets/app.[contenthash].js",
    publicPath: "/",
    clean: true,
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: "ts-loader",
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./index.html",
    }),
  ],
  devServer: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: "all",
    historyApiFallback: true,
    proxy: [
      {
        context: ["/api", "/health"],
        target: backendTarget,
        changeOrigin: true,
      },
    ],
  },
};
