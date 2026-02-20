import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import devServer from '@hono/vite-dev-server'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@executable-specs/shared': path.resolve(__dirname, '../shared/src'),
      '@executable-specs/shared/fixtures': path.resolve(__dirname, '../shared/fixtures'),
      '@executable-specs/domain': path.resolve(__dirname, '../domain/src'),
      // Server package aliases for dev server
      '@executable-specs/server': path.resolve(__dirname, '../server/src'),
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
    tailwindcss(),
    devServer({
      entry: '../server/src/server/index.ts',
      exclude: [/^\/(?!api|health|readyz|livez).*/], // Only handle API and health routes
    }),
  ],
})
