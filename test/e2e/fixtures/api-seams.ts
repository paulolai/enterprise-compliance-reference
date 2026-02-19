import type { APIRequestContext, Page } from '@playwright/test';
import type { CartItem, User } from '@executable-specs/domain';

/**
 * API Seams for Test "Teleport" Pattern
 *
 * Instead of clicking through the UI to establish preconditions (e.g., home -> products -> add to cart -> cart),
 * these functions allow tests to instantly "teleport" to test states via direct API calls.
 *
 * Benefits:
 * - Faster test execution (~100ms vs ~30s for UI navigation)
 * - Better test isolation (no dependencies on UI flows)
 * - More reliable (fewer moving parts)
 */

/**
 * Inject cart state directly into LocalStorage (Client-Side Seam)
 * 
 * Since the application uses client-side Zustand persistence, we must inject 
 * state directly into the browser's localStorage rather than calling a server API.
 * 
 * @param page - Playwright Page object
 * @param cart - Array of cart items
 * @param user - User object
 * @param shippingMethod - Optional shipping method (default: STANDARD)
 */
export async function injectCartState(
  page: Page,
  cart: CartItem[],
  user: User | null,
  shippingMethod: string = 'STANDARD'
) {
  // Ensure we are on the app domain so we can access the correct localStorage
  if (page.url() === 'about:blank') {
    await page.goto('/');
  }

  await page.evaluate(({ cart, user, shippingMethod }) => {
    // Construct Zustand persist state object
    // Note: Version 0 is the default for Zustand persist
    const state = {
      state: {
        items: cart.map(i => ({ ...i, addedAt: Date.now() })),
        user: user,
        shippingMethod: shippingMethod,
        pricingResult: null // App will recalculate on load
      },
      version: 0
    };
    localStorage.setItem('cart-storage', JSON.stringify(state));
  }, { cart, user, shippingMethod });

  // Reload to force hydration of the new state
  await page.reload();
}

/**
 * Seed a cart session via API - allows tests to "teleport" to test states
 * Instead of clicking through: home -> products -> add to cart -> cart
 * We directly POST: /api/debug/seed-session
 *
 * @param request - Playwright APIRequestContext
 * @param cart - Array of cart items
 * @param user - User object with tenure information
 */
export async function seedCartSession(
  request: APIRequestContext,
  cart: CartItem[],
  user: User
) {
  await request.post('http://localhost:5173/api/debug/seed-session', {
    data: { cart, user }
  });
}

/**
 * Seed an authenticated user session
 *
 * @param request - Playwright APIRequestContext
 * @param email - User email (vip@test.com creates VIP user)
 * @param password - User password (for demonstration, any value works)
 */
export async function seedAuthSession(
  request: APIRequestContext,
  email: string,
  password: string
) {
  await request.post('http://localhost:5173/api/debug/seed-auth', {
    data: { email, password }
  });
}

/**
 * Seed a cart with specific shipping method
 *
 * @param request - Playwright APIRequestContext
 * @param cart - Array of cart items
 * @param user - User object
 * @param shippingMethod - Shipping method to set
 */
export async function seedCartWithShipping(
  request: APIRequestContext,
  cart: CartItem[],
  user: User,
  shippingMethod: 'STANDARD' | 'EXPEDITED' | 'EXPRESS'
) {
  await request.post('http://localhost:5173/api/debug/seed-session', {
    data: { cart, user, shippingMethod }
  });
}

/**
 * Convenience helper: Create a simple single-item cart
 */
export async function seedSingleItemCart(
  request: APIRequestContext,
  sku: string,
  price: number,
  quantity: number = 1,
  isVip: boolean = false
) {
  const cart = [{
    sku,
    name: `Test Item - ${sku}`,
    price,
    quantity,
    weightInKg: 1.0
  }];

  const user = {
    email: isVip ? 'vip@test.com' : 'regular@test.com',
    name: isVip ? 'VIP Customer' : 'Regular Customer',
    tenureYears: isVip ? 5 : 0
  };

  await seedCartSession(request, cart, user);
}
