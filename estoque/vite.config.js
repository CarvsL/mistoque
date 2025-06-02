import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseado no modo (development/production)
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      https: {
        key: fs.readFileSync(path.join(__dirname, '..', 'backend', 'ssl', 'localhost+2-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, '..', 'backend', 'ssl', 'localhost+2.pem')),
      },
      proxy: {
        '/api': {
          target: env.VITE_API_URL_HTTPS || 'https://localhost:5443',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
})
