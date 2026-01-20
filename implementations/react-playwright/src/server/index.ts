import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { pricingRouter } from './routes/pricing';
import { authRouter } from './routes/auth';

const app = new Hono();

app.use('*', cors());

app.route('/api/pricing', pricingRouter);
app.route('/api/auth', authRouter);

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
