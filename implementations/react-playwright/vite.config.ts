import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import devServer from '@hono/vite-dev-server'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@executable-specs/shared': path.resolve(__dirname, '../shared/src'),
      '@executable-specs/shared/fixtures': path.resolve(__dirname, '../shared/fixtures'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zod', 'zustand', 'hono'],
    exclude: [
      '@executable-specs/shared',
      'fast-check',
      'better-sqlite3',
      'drizzle-orm',
      'stripe',
    ],
  },
  plugins: [
    react(),
    devServer({
      entry: 'src/server/index.ts',
      exclude: [/^\/(?!api|health|readyz|livez).*/], // Only handle API and health routes
    }),
  ],
})
