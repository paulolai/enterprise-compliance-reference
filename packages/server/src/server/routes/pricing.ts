import { Hono } from 'hono';
import { logger } from '../../lib/logger';
import { PricingEngine } from '@executable-specs/shared';
import { validateBody } from '../../lib/validation/middleware';
import { requestSchemas } from '../../lib/validation/schemas';
import type { CalculatePricingRequest } from '../../lib/validation/schemas';

const router = new Hono();

router.post('/calculate', validateBody(requestSchemas.calculatePricing), async (c) => {
  const { items, user, method } = (c.get('validatedBody' as never) as unknown) as CalculatePricingRequest;

  try {
    const result = PricingEngine.calculate(items, user || { tenureYears: 0 }, method);
    return c.json(result);
  } catch (error) {
    logger.error('Pricing calculation failed', error, { action: 'calculate' });
    return c.json({ error: 'Calculation failed' }, 500);
  }
});

export { router as pricingRouter };
