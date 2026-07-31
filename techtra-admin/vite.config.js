import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  assetsInclude: ['**/*.ttf'],
  build: {
    assetsInlineLimit: 0, // giữ file .ttf riêng, không nhúng inline
  },
  server: {
    port: 5173,
    // Proxy /api -> backend Express (port 5050). Mọi request /api/* trong admin
    // sẽ được forward sang http://localhost:5050/api/* — không cần CORS ở dev.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // File .ttf trong src sẽ được xử lý như asset URL
})
