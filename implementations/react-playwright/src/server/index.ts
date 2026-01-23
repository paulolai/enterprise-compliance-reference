import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { pricingRouter } from './routes/pricing';
import { authRouter } from './routes/auth';
import { debugRouter } from './routes/debug';
import { ordersRouter } from './routes/orders';
import { productsRouter } from './routes/products';
import { paymentsRouter } from './routes/payments';
import { healthRouter } from './routes/health';
import { securityHeaders } from './middleware/security';

const app = new Hono();

app.use('*', cors());
app.use('*', securityHeaders());

app.route('/api/pricing', pricingRouter);
app.route('/api/auth', authRouter);
app.route('/api/debug', debugRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/products', productsRouter);
app.route('/api/payments', paymentsRouter);
app.route('/', healthRouter);

export default app;
