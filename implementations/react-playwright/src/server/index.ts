import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { pricingRouter } from './routes/pricing';
import { authRouter } from './routes/auth';
import { debugRouter } from './routes/debug';
import { ordersRouter } from './routes/orders';
import { productsRouter } from './routes/products';
import { paymentsRouter } from './routes/payments';

const app = new Hono();

app.use('*', cors());

app.route('/api/pricing', pricingRouter);
app.route('/api/auth', authRouter);
app.route('/api/debug', debugRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/products', productsRouter);
app.route('/api/payments', paymentsRouter);

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
