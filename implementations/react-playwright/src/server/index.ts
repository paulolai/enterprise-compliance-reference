import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { pricingRouter } from './routes/pricing';
import { authRouter } from './routes/auth';
import { debugRouter } from './routes/debug';
import { ordersRouter } from './routes/orders';
import { productsRouter } from './routes/products';
import { paymentsRouter } from './routes/payments';
import { securityHeaders } from './middleware/security';
import { getReadyzHandler, getLivezHandler } from './routes/health-handlers';

const app = new Hono();

app.use('*', cors());
app.use('*', securityHeaders());

// API routes - registered first to ensure priority
app.route('/api/pricing', pricingRouter);
app.route('/api/auth', authRouter);
app.route('/api/debug', debugRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/products', productsRouter);
app.route('/api/payments', paymentsRouter);

// API fallback: catch all unmatched /api/* routes and return proper JSON 404
// This MUST come after all specific API routes
app.all('/api/*', (c) => {
  return c.json({ error: 'API endpoint not found', path: c.req.path }, 404);
});

// Health check routes - at root level
app.get('/health', (c) => c.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));
app.get('/readyz', getReadyzHandler);
app.get('/livez', getLivezHandler);

export default app;
