import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { productsRouter } from './routes/products';
import { securityHeaders } from './middleware/security';
import { rateLimit } from './middleware/rate-limit';
import { healthRouter } from './routes/health';

const app = new Hono();

app.use('*', cors());
app.use('*', securityHeaders());
app.use('/api/*', rateLimit());

// API routes
app.route('/api/products', productsRouter);

// API fallback
app.all('/api/*', (c) => {
  return c.json({ error: 'API endpoint not found', path: c.req.path }, 404);
});

// Health check routes
app.route('/', healthRouter);

export default app;
