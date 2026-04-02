import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const API_SERVER = process.env.API_SERVER_URL || 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@executable-specs/shared': path.resolve(__dirname, '../shared/src'),
      '@executable-specs/shared/fixtures': path.resolve(__dirname, '../shared/fixtures'),
      '@executable-specs/domain': path.resolve(__dirname, '../domain/src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zod', 'zustand'],
  },
  server: {
    proxy: {
      '/api': { target: API_SERVER, changeOrigin: true },
      '/health': { target: API_SERVER, changeOrigin: true },
      '/readyz': { target: API_SERVER, changeOrigin: true },
      '/livez': { target: API_SERVER, changeOrigin: true },
      '/metrics': { target: API_SERVER, changeOrigin: true },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
