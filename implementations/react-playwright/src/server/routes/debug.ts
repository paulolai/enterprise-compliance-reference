import { Hono } from 'hono';
import type { CartItem, User } from '../../../../shared/src';
import { useCartStore } from '../../store/cartStore';
import { ShippingMethod } from '../../../../shared/src';

const router = new Hono();

/**
 * Debug API Routes for Test Automation
 *
 * These routes provide "teleport" functionality for tests - allowing tests to
 * jump directly to specific application states instead of clicking through UI.
 *
 * IMPORTANT: These should only be enabled in development/test environments.
 */

/**
 * POST /api/debug/seed-session
 * Seed a cart session for test isolation
 *
 * This is the primary "teleport" endpoint that allows tests to establish
 * preconditions in ~100ms instead of ~30s of UI clicking.
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

  // Directly set the store state for tests
  useCartStore.setState({
    items: cartWithMetadata,
    user: user || null,
    shippingMethod: shippingMethod ? ShippingMethod[shippingMethod] : ShippingMethod.STANDARD,
    pricingResult: null // Reset pricing so it recalculates
  });

  return c.json({ success: true, itemCount: cart.length });
});

/**
 * POST /api/debug/seed-auth
 * Seed an authenticated session for tests
 */
router.post('/seed-auth', async (c) => {
  const { email } = await c.req.json();

  if (!email) {
    return c.json({ error: 'email is required' }, 400);
  }

  // Create a mock user based on email
  const mockUser: User = {
    email,
    name: 'Test User',
    // Auto-determine VIP status from email
    tenureYears: email.startsWith('vip') || email.includes('vip')
      ? 4
      : email.startsWith('long')
      ? 10
      : 0
  };

  useCartStore.setState({ user: mockUser });

  return c.json({ success: true, user: mockUser });
});

/**
 * POST /api/debug/reset
 * Reset store to initial state
 */
router.post('/reset', async (c) => {
  useCartStore.setState({
    items: [],
    user: null,
    shippingMethod: ShippingMethod.STANDARD,
    pricingResult: null
  });

  return c.json({ success: true });
});

/**
 * GET /api/debug/state
 * Get current store state (useful for debugging)
 */
router.get('/state', async (c) => {
  const state = useCartStore.getState();

  // Omit addedAt from items for cleaner response
  const itemsWithoutMetadata = state.items.map(({ addedAt, ...item }) => item);

  return c.json({
    items: itemsWithoutMetadata,
    user: state.user,
    shippingMethod: state.shippingMethod,
    hasPricingResult: state.pricingResult !== null,
    itemCount: state.items.length
  });
});

export { router as debugRouter };
