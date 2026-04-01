import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: ['leaflet'],
  },
  server: {
    allowedHosts: [
      'wade-unindulged-fruitlessly.ngrok-free.dev'
    ]
  }
});
