import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true
      },
      '/appointments': 'http://localhost:3000',
      '/doctors': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
      '/absences': 'http://localhost:3000',
      '/availabilities': 'http://localhost:3000',
      '/reviews': 'http://localhost:3000',
    }
  }
})
