import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// In development, /api is proxied to the backend (VITE_BACKEND_URL, default http://localhost:5000).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target: env.VITE_BACKEND_URL || 'http://localhost:5000', changeOrigin: true },
      },
    },
  }
})
