const fs = require("fs");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const backendTarget = process.env.BACKEND_TARGET || "https://backend:4000";
const frontendOrigin = process.env.FRONTEND_ORIGIN || "https://localhost:3000";
const shouldUseHttps = frontendOrigin.startsWith("https://");
const tlsKeyPath = process.env.TLS_KEY_FILE || "/certs/dev-localhost.key";
const tlsCertPath = process.env.TLS_CERT_FILE || "/certs/dev-localhost.crt";
const trustedCaPath = process.env.NODE_EXTRA_CA_CERTS || "/certs/mkcert-rootCA.pem";
const hasCustomTlsFiles =
  fs.existsSync(tlsKeyPath) && fs.existsSync(tlsCertPath);

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
    server: shouldUseHttps
      ? hasCustomTlsFiles
        ? {
            type: "https",
            options: {
              key: fs.readFileSync(tlsKeyPath),
              cert: fs.readFileSync(tlsCertPath),
            },
          }
        : "https"
      : "http",
    allowedHosts: "all",
    historyApiFallback: true,
    proxy: [
      {
        context: [
          "/api",
          "/health",
          "/auth",
          "/users",
          "/rooms",
          "/game",
          "/scores",
          "/quizzes",
          "/socket.io",
        ],
        target: backendTarget,
        changeOrigin: true,
        secure: fs.existsSync(trustedCaPath),
        ws: true,
      },
    ],
  },
};
