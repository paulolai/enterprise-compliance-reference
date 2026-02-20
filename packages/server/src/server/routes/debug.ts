import { Hono } from 'hono';
import type { CartItem } from '@executable-specs/shared';
import { ShippingMethod } from '@executable-specs/shared';
import { isProduction } from '../../lib/env';
import { validateBody } from '../../lib/validation/middleware';
import { requestSchemas } from '../../lib/validation/schemas';
import type { SeedAuthRequest } from '../../lib/validation/schemas';
import type { SeedSessionRequest } from '../../lib/validation/schemas';

const router = new Hono();

/**
 * Debug API Routes for Test Automation
 *
 * These routes provide "teleport" functionality for tests - allowing tests to
 * jump directly to specific application states instead of clicking through UI.
 *
 * IMPORTANT: These should only be enabled in development/test environments.
 * Debug endpoints are disabled in production.
 */

// Add production guard to all debug routes
router.all('/*', async (c, next) => {
  if (isProduction) {
    return c.json({ error: 'Debug endpoints disabled in production' }, 404);
  }
  await next();
});

/**
 * POST /api/debug/seed-session
 * Seed a cart session for test isolation
 */
router.post('/seed-session', validateBody(requestSchemas.seedSession), async (c) => {
  const { cart, user, shippingMethod } = (c.get('validatedBody' as never) as unknown) as SeedSessionRequest;

  // Add metadata timestamps to each item
  const cartWithMetadata = cart.map((item: CartItem) => ({
    ...item,
    addedAt: Date.now()
  }));

  // Return the data for client to set in localStorage
  return c.json({
    success: true,
    itemCount: cart.length,
    items: cartWithMetadata,
    user: user || null,
    shippingMethod: shippingMethod || ShippingMethod.STANDARD
  });
});

/**
 * POST /api/debug/seed-auth
 * Seed an authenticated session for tests
 */
router.post('/seed-auth', validateBody(requestSchemas.seedAuth), async (c) => {
  const { email } = (c.get('validatedBody' as never) as unknown) as SeedAuthRequest;

  // Create a mock user based on email
  const mockUser = {
    email,
    // Auto-determine VIP status from email
    tenureYears: email.startsWith('vip') || email.includes('vip')
      ? 4
      : email.startsWith('long')
      ? 10
      : 0
  };

  return c.json({ success: true, user: mockUser });
});

/**
 * POST /api/debug/reset
 * Returns reset state data for client to clear localStorage.
 */
router.post('/reset', async (c) => {
  return c.json({
    success: true,
    items: [],
    user: null,
    shippingMethod: ShippingMethod.STANDARD,
    pricingResult: null
  });
});

/**
 * GET /api/debug/state
 * Get current store state from localStorage for debugging
 */
router.get('/state', async (c) => {
  return c.json({
    error: 'This endpoint runs in server context and cannot access browser state. Use window.__cartStore.getState() in browser console instead.'
  });
});

export { router as debugRouter };
