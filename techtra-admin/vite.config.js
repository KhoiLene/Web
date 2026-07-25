import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.ttf'],
  build: {
    assetsInlineLimit: 0, // giữ file .ttf riêng, không nhúng inline
  },
  // File .ttf trong src sẽ được xử lý như asset URL
})
