import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { registerAllureMetadata } from '../../../../shared/fixtures/allure-helpers';
import { CartItem, User } from '../../../../shared/src';

// Helper to register Allure metadata with hierarchy
function registerApiMetadata(
  metadata: {
    ruleReference: string;
    rule: string;
    tags: string[];
  }
) {
  const finalMetadata = {
    ...metadata,
    parentSuite: 'API Verification',
    suite: 'Debug',
    feature: 'Debug API',
  };
  registerAllureMetadata(allure, finalMetadata);
}

// API base URL
const API_BASE = '/api/debug';

/**
 * Tests for the Debug API which provides "teleport" functionality for test isolation.
 * These endpoints allow tests to jump directly to specific application states
 * without clicking through the UI.
 */
test.describe('Debug API Tests', () => {
  // Reset state before each test
  test.beforeEach(async ({ request }) => {
    await request.post(`${API_BASE}/reset`);
  });

  describe('POST /api/debug/seed-session', () => {
    test('seeds cart with items', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-session sets cart items and metadata',
        tags: ['@debug', '@teleport'],
        name: 'Cart seeding',
      });

      const cart: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 2, weightInKg: 0.1 },
      ];

      const response = await request.post(`${API_BASE}/seed-session`, {
        data: { cart },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.itemCount).toBe(1);

      // Verify state
      const stateResponse = await request.get(`${API_BASE}/state`);
      const state = await stateResponse.json();
      expect(state.items.length).toBe(1);
      expect(state.items[0].sku).toBe('WIRELESS-EARBUDS');
      expect(state.items[0].quantity).toBe(2);
    });

    test('seeds empty cart', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'Empty cart is a valid seed state',
        tags: ['@debug', '@boundary'],
        name: 'Empty cart seeding',
      });

      const response = await request.post(`${API_BASE}/seed-session`, {
        data: { cart: [] },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.itemCount).toBe(0);

      // Verify state
      const stateResponse = await request.get(`${API_BASE}/state`);
      const state = await stateResponse.json();
      expect(state.itemCount).toBe(0);
    });

    test('seeds multiple cart items', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-session handles multiple items',
        tags: ['@debug', '@teleport'],
        name: 'Multiple items seeding',
      });

      const cart: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
        { sku: 'SMART-WATCH', priceInCents: 19900, quantity: 1, weightInKg: 0.2 },
        { sku: 'TABLET-10', priceInCents: 44900, quantity: 1, weightInKg: 1.2 },
      ];

      const response = await request.post(`${API_BASE}/seed-session`, {
        data: { cart },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.itemCount).toBe(3);

      // Verify state
      const stateResponse = await request.get(`${API_BASE}/state`);
      const state = await stateResponse.json();
      expect(state.itemCount).toBe(3);
    });

    test('seeds user with cart', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-session can include user data',
        tags: ['@debug', '@teleport'],
        name: 'User with cart seeding',
      });

      const cart: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];
      const user: User = { tenureYears: 0, email: 'test@example.com', name: 'Test User' };

      const response = await request.post(`${API_BASE}/seed-session`, {
        data: { cart, user },
      });

      expect(response.status()).toBe(200);

      // Verify state
      const stateResponse = await request.get(`${API_BASE}/state`);
      const state = await stateResponse.json();
      expect(state.user).toBeTruthy();
      expect(state.user.email).toBe('test@example.com');
    });

    test('seeds shipping method', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-session can set shipping method',
        tags: ['@debug', '@teleport'],
        name: 'Shipping method seeding',
      });

      const cart: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];

      const response = await request.post(`${API_BASE}/seed-session`, {
        data: { cart, shippingMethod: 'EXPRESS' },
      });

      expect(response.status()).toBe(200);

      // Verify state
      const stateResponse = await request.get(`${API_BASE}/state`);
      const state = await stateResponse.json();
      expect(state.shippingMethod).toBe('EXPRESS');
    });

    test('validates cart is an array', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-session validates cart is an array',
        tags: ['@debug', '@validation'],
        name: 'Cart validation',
      });

      const response = await request.post(`${API_BASE}/seed-session`, {
        data: { cart: 'not-an-array' },
      });

      expect(response.status()).toBe(400);
    });

    test('resets pricing result when seeding cart', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-session clears previous pricing result',
        tags: ['@debug', '@teleport'],
        name: 'Pricing reset on seed',
      });

      const cart: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];

      const response = await request.post(`${API_BASE}/seed-session`, {
        data: { cart, shippingMethod: 'STANDARD' },
      });

      expect(response.status()).toBe(200);

      // Verify pricing result is reset
      const stateResponse = await request.get(`${API_BASE}/state`);
      const state = await stateResponse.json();
      expect(state.hasPricingResult).toBe(false);
    });
  });

  describe('POST /api/debug/seed-auth', () => {
    test('seeds regular user', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-auth creates regular user from email',
        tags: ['@debug', '@teleport'],
        name: 'Regular user seeding',
      });

      const response = await request.post(`${API_BASE}/seed-auth`, {
        data: { email: 'user@example.com' },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.tenureYears).toBe(0); // Regular user

      // Verify state
      const stateResponse = await request.get(`${API_BASE}/state`);
      const state = await stateResponse.json();
      expect(state.user.tenureYears).toBe(0);
    });

    test('seeds VIP user (email starts with vip)', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-auth creates VIP user from vip@ email',
        tags: ['@debug', '@teleport'],
        name: 'VIP user seeding',
      });

      const response = await request.post(`${API_BASE}/seed-auth`, {
        data: { email: 'vip@example.com' },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.user.tenureYears).toBe(4); // VIP user

      // Verify state
      const stateResponse = await request.get(`${API_BASE}/state`);
      const state = await stateResponse.json();
      expect(state.user.tenureYears).toBeGreaterThan(2); // VIP threshold
    });

    test('seeds VIP user (email contains vip)', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-auth recognizes vip in email',
        tags: ['@debug', '@teleport'],
        name: 'VIP pattern recognition',
      });

      const response = await request.post(`${API_BASE}/seed-auth`, {
        data: { email: 'premium.vip@company.com' },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.user.tenureYears).toBe(4); // VIP user
    });

    test('seeds long-tenure user', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-auth creates long-tenure user',
        tags: ['@debug', '@teleport'],
        name: 'Long-tenure user seeding',
      });

      const response = await request.post(`${API_BASE}/seed-auth`, {
        data: { email: 'longterm@example.com' },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.user.tenureYears).toBe(10); // Long tenure
    });

    test('validates email is required', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-auth validates email parameter',
        tags: ['@debug', '@validation'],
        name: 'Email validation',
      });

      const response = await request.post(`${API_BASE}/seed-auth`, {
        data: {}, // Missing email
      });

      expect(response.status()).toBe(400);
    });
  });

  describe('POST /api/debug/reset', () => {
    test('resets cart to empty', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'reset clears all cart items',
        tags: ['@debug', '@reset'],
        name: 'Cart reset',
      });

      // First seed a cart
      await request.post(`${API_BASE}/seed-session`, {
        data: {
          cart: [{ sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 }],
        },
      });

      // Verify cart has items
      let stateResponse = await request.get(`${API_BASE}/state`);
      let state = await stateResponse.json();
      expect(state.itemCount).toBe(1);

      // Reset
      const resetResponse = await request.post(`${API_BASE}/reset`);
      expect(resetResponse.status()).toBe(200);

      // Verify cart is empty
      stateResponse = await request.get(`${API_BASE}/state`);
      state = await stateResponse.json();
      expect(state.itemCount).toBe(0);
    });

    test('resets user to null', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'reset clears user authentication',
        tags: ['@debug', '@reset'],
        name: 'User reset',
      });

      // Seed a user
      await request.post(`${API_BASE}/seed-auth`, {
        data: { email: 'user@example.com' },
      });

      // Verify user exists
      let stateResponse = await request.get(`${API_BASE}/state`);
      let state = await stateResponse.json();
      expect(state.user).toBeTruthy();

      // Reset
      await request.post(`${API_BASE}/reset`);

      // Verify user is null
      stateResponse = await request.get(`${API_BASE}/state`);
      state = await stateResponse.json();
      expect(state.user).toBeNull();
    });

    test('resets shipping method to STANDARD', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'reset resets shipping method to standard',
        tags: ['@debug', '@reset'],
        name: 'Shipping reset',
      });

      // Seed with EXPRESS shipping
      await request.post(`${API_BASE}/seed-session`, {
        data: {
          cart: [{ sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 }],
          shippingMethod: 'EXPRESS',
        },
      });

      // Verify shipping is EXPRESS
      let stateResponse = await request.get(`${API_BASE}/state`);
      let state = await stateResponse.json();
      expect(state.shippingMethod).toBe('EXPRESS');

      // Reset
      await request.post(`${API_BASE}/reset`);

      // Verify shipping is STANDARD
      stateResponse = await request.get(`${API_BASE}/state`);
      state = await stateResponse.json();
      expect(state.shippingMethod).toBe('STANDARD');
    });

    test('resets pricing result to null', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'reset clears cached pricing result',
        tags: ['@debug', '@reset'],
        name: 'Pricing result reset',
      });

      // Seed a cart
      await request.post(`${API_BASE}/seed-session`, {
        data: {
          cart: [{ sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 }],
        },
      });

      // After reset, verify pricing result is not set
      const stateResponse = await request.get(`${API_BASE}/state`);
      const state = await stateResponse.json();
      expect(state.hasPricingResult).toBe(false);
    });

    test('reset is idempotent', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'reset can be called multiple times without error',
        tags: ['@debug', '@robustness'],
        name: 'Idempotent reset',
      });

      // Call reset multiple times
      const response1 = await request.post(`${API_BASE}/reset`);
      expect(response1.status()).toBe(200);

      const response2 = await request.post(`${API_BASE}/reset`);
      expect(response2.status()).toBe(200);

      const response3 = await request.post(`${API_BASE}/reset`);
      expect(response3.status()).toBe(200);

      // Verify all return success
      expect(await response1.json()).toEqual({ success: true });
      expect(await response2.json()).toEqual({ success: true });
      expect(await response3.json()).toEqual({ success: true });
    });
  });

  describe('GET /api/debug/state', () => {
    test('returns current cart items', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'state endpoint returns current cart items',
        tags: ['@debug', '@verification'],
        name: 'Cart items in state',
      });

      // Seed items
      await request.post(`${API_BASE}/seed-session`, {
        data: {
          cart: [
            { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 2, weightInKg: 0.1 },
            { sku: 'SMART-WATCH', priceInCents: 19900, quantity: 1, weightInKg: 0.2 },
          ],
        },
      });

      const response = await request.get(`${API_BASE}/state`);
      expect(response.status()).toBe(200);

      const state = await response.json();
      expect(state.items).toHaveLength(2);
      expect(state.items[0].sku).toBe('WIRELESS-EARBUDS');
      expect(state.items[1].sku).toBe('SMART-WATCH');
    });

    test('returns current user', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'state endpoint returns current user',
        tags: ['@debug', '@verification'],
        name: 'User in state',
      });

      // Seed VIP user
      await request.post(`${API_BASE}/seed-auth`, {
        data: { email: 'vip@example.com' },
      });

      const response = await request.get(`${API_BASE}/state`);
      expect(response.status()).toBe(200);

      const state = await response.json();
      expect(state.user).toBeTruthy();
      expect(state.user.email).toBe('vip@example.com');
      expect(state.user.tenureYears).toBe(4);
    });

    test('returns shipping method', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'state endpoint returns shipping method',
        tags: ['@debug', '@verification'],
        name: 'Shipping method in state',
      });

      // Seed with EXPRESS
      await request.post(`${API_BASE}/seed-session`, {
        data: {
          cart: [{ sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 }],
          shippingMethod: 'EXPRESS',
        },
      });

      const response = await request.get(`${API_BASE}/state`);
      expect(response.status()).toBe(200);

      const state = await response.json();
      expect(state.shippingMethod).toBe('EXPRESS');
    });

    test('returns item count', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'state endpoint returns total item count',
        tags: ['@debug', '@verification'],
        name: 'Item count in state',
      });

      // Seed items (different quantities)
      await request.post(`${API_BASE}/seed-session`, {
        data: {
          cart: [
            { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 3, weightInKg: 0.1 },
            { sku: 'SMART-WATCH', priceInCents: 19900, quantity: 2, weightInKg: 0.2 },
          ],
        },
      });

      const response = await request.get(`${API_BASE}/state`);
      expect(response.status()).toBe(200);

      const state = await response.json();
      expect(state.itemCount).toBe(2); // 2 items, not 5 (quantities)
    });

    test('returns hasPricingResult flag', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'state endpoint indicates if pricing result exists',
        tags: ['@debug', '@verification'],
        name: 'Pricing result flag in state',
      });

      const response = await request.get(`${API_BASE}/state`);
      expect(response.status()).toBe(200);

      const state = await response.json();
      expect(typeof state.hasPricingResult).toBe('boolean');
      expect(state.hasPricingResult).toBe(false); // After reset
    });

    test('excludes addedAt metadata from items', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'state endpoint omits addedAt from items',
        tags: ['@debug', '@verification'],
        name: 'Metadata filtering',
      });

      await request.post(`${API_BASE}/seed-session`, {
        data: {
          cart: [{ sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 }],
        },
      });

      const response = await request.get(`${API_BASE}/state`);
      expect(response.status()).toBe(200);

      const state = await response.json();
      // Verify addedAt is not in the response
      expect('addedAt' in state.items[0]).toBe(false);
    });
  });
});
