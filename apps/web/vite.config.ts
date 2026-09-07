import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: true,
    // Same-origin in dev, matching the deployed shape where the API serves
    // the built client. No CORS anywhere. Overridable so the Docker Compose
    // web container can reach the api container by service name instead of
    // localhost.
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? `http://localhost:${process.env.API_PORT ?? 3000}`,
    },
  },
})
