/**
 * Standalone Server Entry Point
 *
 * This file creates a standalone HTTP server for production deployment.
 * In development, the API is served via Vite's middleware (see vite.config.ts).
 *
 * Usage:
 *   - Development: pnpm run dev (Vite middleware)
 *   - Production: pnpm run start:server (standalone)
 *   - Docker: ENTRYPOINT points to compiled version
 */

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import app from './index';
import { setupGracefulShutdown } from './shutdown';
import { logger } from '../lib/logger';
import { env, getEnvSummary } from '../lib/env';
import { seedProducts } from '../db/seed';

// Ensure products are seeded
await seedProducts();

// Add static file serving for production build
app.use('/*', serveStatic({ root: './dist' }));
app.use('/*', serveStatic({ root: './dist/index.html' }));

// Server configuration
const port = env.PORT;
const host = process.env.HOST || '0.0.0.0';

logger.info('Starting standalone server...', getEnvSummary());

// Start HTTP server
const server = await serve({
  fetch: app.fetch,
  port,
  hostname: host,
}, (info) => {
  logger.info(`Server listening on ${info.address}:${info.port}`);
});

// Setup graceful shutdown handlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
setupGracefulShutdown(server as any);
