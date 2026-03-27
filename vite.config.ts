import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/openvsx-api': {
        target: 'https://open-vsx.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openvsx-api/, ''),
      },
    },
  },
})
