import { defineConfig, loadEnv } from 'vite'
import process from "node:process";
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || "http://localhost:4000";

  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: ["leaflet"],
    },
    server: {
      allowedHosts: ["wade-unindulged-fruitlessly.ngrok-free.dev"],
      proxy: {
        "/api": { target: proxyTarget, changeOrigin: true, secure: false },
        "/images": { target: proxyTarget, changeOrigin: true, secure: false },
        "/socket.io": { target: proxyTarget, ws: true, changeOrigin: true, secure: false },
      },
    },
  };
});
