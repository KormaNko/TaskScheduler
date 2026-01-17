import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [react(), tailwindcss()],
  // Dev server proxy: forward /api requests to your backend during development
  // Backend in your docker-compose is mapped to 127.0.0.1:80 — use that and rewrite to strip the /api prefix
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
}))
