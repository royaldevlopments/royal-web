import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist' },
  server: { port: 8008, host: '0.0.0.0', proxy: { '/devlopment/api': { target: 'http://localhost:3002', rewrite: p => p.replace('/devlopment', ''), changeOrigin: true } } },
})
