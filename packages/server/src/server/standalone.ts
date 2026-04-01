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
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import path from 'path';
import {
  pricingRouter,
  authRouter,
  debugRouter,
  ordersRouter,
  productsRouter,
  paymentsRouter,
  healthRouter,
} from './index';
import { securityHeaders } from './middleware/security';
import { rateLimit } from './middleware/rate-limit';
import { metrics } from '../lib/metrics';
import { setupGracefulShutdown } from './shutdown';
import { logger } from '../lib/logger';
import { env, getEnvSummary } from '../lib/env';
import { seedProducts } from '../db/seed';

// Ensure products are seeded
await seedProducts();

// Create a fresh app instance - do not mutate the shared app from index.ts
const app = new Hono();

app.use('*', cors());
app.use('*', securityHeaders());
app.use('/api/*', rateLimit());

// API routes
app.route('/api/pricing', pricingRouter);
app.route('/api/auth', authRouter);
app.route('/api/debug', debugRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/products', productsRouter);
app.route('/api/payments', paymentsRouter);

// API fallback: catch all unmatched /api/* routes and return proper JSON 404
app.all('/api/*', (c) => {
  return c.json({ error: 'API endpoint not found', path: c.req.path }, 404);
});

// Health check routes
app.route('/', healthRouter);

// Prometheus metrics endpoint
app.get('/metrics', (c) => {
  c.header('Content-Type', 'text/plain; version=0.0.4');
  return c.text(metrics.exportPrometheus());
});

// Serve static files from client build output
const clientDist = path.resolve(__dirname, '../../../client/dist');
app.use('/*', serveStatic({ root: clientDist }));

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
