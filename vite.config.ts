import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.GITHUB_PAGES === 'true' ? '/AdegaZ/' : '/',
  plugins: [react(), mode === 'https' ? basicSsl() : null].filter(Boolean),
  server: {
    host: mode === 'https' ? '0.0.0.0' : '127.0.0.1',
    proxy: {
      '/api/wireshape': {
        target: 'https://data.wireshape.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wireshape/, ''),
      },
    },
  },
}))
