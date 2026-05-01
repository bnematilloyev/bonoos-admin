import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 413 Request Entity Too Large — odatda Vite emas, balki API oldidagi nginx yoki backend body limiti.
 * Yechim: API nginx da `client_max_body_size 256m;` (yoki kattaroq) qo‘ying — misol: `nginx.audio-upload.example.conf`.
 * Lokal backend (Fiber/Echo/Gin va hok.) da ham multipart limitini oshiring.
 */
const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'https://api.vibrant.uz'

/**
 * WebSocket handshake: Postman `Authorization` + `x-uuid` yubora oladi; brauzer — yo‘q.
 * Shuning uchun client URL query da `access_token` va `x_uuid` yuboradi; bu yerda ularni
 * upstream so‘rovga Postmandagi kabi sarlavha sifatida qo‘yamiz (101 Switching Protocols).
 */
function attachWsAuthHeaderInjection(proxy) {
  proxy.on('proxyReqWs', (proxyReq, req) => {
    try {
      const host = req.headers.host || 'localhost'
      const u = new URL(req.url || '', `http://${host}`)
      const token = u.searchParams.get('access_token')
      const xUuid = u.searchParams.get('x_uuid')
      if (token) proxyReq.setHeader('Authorization', `Bearer ${token}`)
      if (xUuid) proxyReq.setHeader('x-uuid', xUuid)
    } catch {
      /* ignore */
    }
  })
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: devProxyTarget,
        changeOrigin: true,
        secure: devProxyTarget.startsWith('https'),
        ws: true,
        configure: (proxy) => attachWsAuthHeaderInjection(proxy),
      },
    },
  },
})
