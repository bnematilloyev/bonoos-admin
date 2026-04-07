import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 413 Request Entity Too Large — odatda Vite emas, balki API oldidagi nginx yoki backend body limiti.
 * Yechim: API nginx da `client_max_body_size 256m;` (yoki kattaroq) qo‘ying — misol: `nginx.audio-upload.example.conf`.
 * Lokal backend (Fiber/Echo/Gin va hok.) da ham multipart limitini oshiring.
 */
const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'https://api.vibrant.uz'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: devProxyTarget,
        changeOrigin: true,
        secure: devProxyTarget.startsWith('https'),
      },
    },
  },
})
