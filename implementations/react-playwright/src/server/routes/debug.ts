import { Hono } from 'hono';
import type { CartItem, User } from '../../../../shared/src';
import { ShippingMethod } from '../../../../shared/src';

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
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Debug endpoints disabled in production' }, 404);
  }
  await next();
});

/**
 * POST /api/debug/seed-session
 * Seed a cart session for test isolation
 *
 * This endpoint returns the data that tests should use to directly set
 * localStorage since server-side code cannot access browser Zustand store.
 *
 * Usage in tests:
 *   const response = await fetch('/api/debug/seed-session', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ cart, user, shippingMethod })
 *   });
 *   const data = await response.json();
 *   localStorage.setItem('cart-storage', JSON.stringify({
 *     state: { items: data.items, user: data.user, shippingMethod: data.shippingMethod, pricingResult: null },
 *     version: 0
 *   }));
 */
router.post('/seed-session', async (c) => {
  const { cart, user, shippingMethod } = await c.req.json();

  // Validate input
  if (!Array.isArray(cart)) {
    return c.json({ error: 'cart must be an array' }, 400);
  }

  // Add metadata timestamps to each item
  const cartWithMetadata = cart.map((item: CartItem) => ({
    ...item,
    addedAt: Date.now()
  }));

  // Handle shippingMethod - it could be the enum string or the value
  const method = shippingMethod
    ? (shippingMethod in ShippingMethod ? ShippingMethod[shippingMethod as keyof typeof ShippingMethod] : shippingMethod)
    : ShippingMethod.STANDARD;

  // Return the data for client to set in localStorage
  return c.json({
    success: true,
    itemCount: cart.length,
    items: cartWithMetadata,
    user: user || null,
    shippingMethod: method
  });
});

/**
 * POST /api/debug/seed-auth
 * Seed an authenticated session for tests
 *
 * Returns the user data for client to set in localStorage.
 */
router.post('/seed-auth', async (c) => {
  const { email } = await c.req.json();

  if (!email) {
    return c.json({ error: 'email is required' }, 400);
  }

  // Create a mock user based on email
  const mockUser: User = {
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
 * This endpoint can't access the actual browser state since it runs on server.
 */
router.get('/state', async (c) => {
  return c.json({
    error: 'This endpoint runs in server context and cannot access browser state. Use window.__cartStore.getState() in browser console instead.'
  });
});

export { router as debugRouter };
