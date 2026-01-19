import { Hono } from 'hono';
import { PricingEngine, CartItemSchema, UserSchema, ShippingMethodSchema } from '../../../../shared/src';

const router = new Hono();

router.post('/calculate', async (c) => {
  try {
    const body = await c.req.json();
    const items = CartItemSchema.array().parse(body.items);
    const user = UserSchema.parse(body.user);
    const method = ShippingMethodSchema.parse(body.method);

    const result = PricingEngine.calculate(items, user, method);
    return c.json(result);
  } catch (error) {
    console.error('Pricing calculation error:', error);
    return c.json({ error: 'Invalid request or calculation failed' }, 400);
  }
});

export { router as pricingRouter };
