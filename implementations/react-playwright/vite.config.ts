import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import app from './src/server/index'
import http from 'http'
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
    {
      name: 'hono-server',
      configureServer(server) {
        return () => {
          server.middlewares.use(async (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => {
            if (req.url?.startsWith('/api')) {
              // Create headers from Node.js req.headers
              const headers = new Headers();
              for (const [key, value] of Object.entries(req.headers)) {
                if (Array.isArray(value)) {
                  value.forEach(v => headers.append(key, v));
                } else if (value) {
                  headers.set(key, value);
                }
              }

              let body: string | undefined = undefined;
              if (req.method !== 'GET' && req.method !== 'HEAD') {
                body = await new Promise((resolve) => {
                  const chunks: Buffer[] = [];
                  req.on('data', (chunk: Buffer) => chunks.push(chunk));
                  req.on('end', () => resolve(Buffer.concat(chunks).toString()));
                });
              }

              const origin = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers['host'] || 'localhost:5173'}`;
              const url = new URL(req.url || '', origin);

              const request = new Request(url.toString(), {
                method: req.method || 'GET',
                headers,
                body: body || undefined,
              });

              const response = await app.fetch(request);

              res.statusCode = response.status;
              res.statusMessage = response.statusText;

              response.headers.forEach((value, key) => {
                res.setHeader(key, value);
              });

              if (response.body) {
                const reader = response.body.getReader();
                const chunks: Uint8Array[] = [];
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  if (value) chunks.push(value);
                }
                if (chunks.length > 0) {
                  res.end(Buffer.concat(chunks.map(c => Buffer.from(c))));
                  return;
                }
              }
              res.end();
              return;
            }
            next();
          });
        };
      },
    },
  ],
})
