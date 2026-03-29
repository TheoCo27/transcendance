import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: Number(process.env.FRONTEND_PORT || 3000),
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_TARGET || "http://backend:4000",
        changeOrigin: true,
      },
      "/health": {
        target: process.env.VITE_BACKEND_TARGET || "http://backend:4000",
        changeOrigin: true,
      },
    },
  },
});
