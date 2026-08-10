import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/bonafide/submit': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/bonafide/student': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/bonafide/admin': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/bonafide/download': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/dev': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
})
