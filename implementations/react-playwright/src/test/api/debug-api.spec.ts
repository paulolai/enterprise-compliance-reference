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

  test.describe('POST /api/debug/seed-session', () => {
    test('seeds cart with items', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-session sets cart items and metadata',
        tags: ['@debug', '@teleport'],
        name: 'Cart seeding',
      });

      const cart: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', price: 8900, name: "Test Item", quantity: 2, weightInKg: 0.1 },
      ];

      const response = await request.post(`${API_BASE}/seed-session`, {
        data: { cart },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.itemCount).toBe(1);
      // Items in response
      expect(result.items.length).toBe(1);
      expect(result.items[0].sku).toBe('WIRELESS-EARBUDS');
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
    });

    test('seeds multiple cart items', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-session handles multiple items',
        tags: ['@debug', '@teleport'],
        name: 'Multiple items seeding',
      });

      const cart: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', price: 8900, name: "Test Item", quantity: 1, weightInKg: 0.1 },
        { sku: 'SMART-WATCH', price: 19900, name: "Test Item", quantity: 1, weightInKg: 0.2 },
        { sku: 'TABLET-10', price: 44900, name: "Test Item", quantity: 1, weightInKg: 1.2 },
      ];

      const response = await request.post(`${API_BASE}/seed-session`, {
        data: { cart },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.itemCount).toBe(3);
    });

    test('seeds user with cart', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-session can include user data',
        tags: ['@debug', '@teleport'],
        name: 'User with cart seeding',
      });

      const cart: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', price: 8900, name: "Test Item", quantity: 1, weightInKg: 0.1 },
      ];
      const user: User = { tenureYears: 0, email: 'test@example.com', name: 'Test User' };

      const response = await request.post(`${API_BASE}/seed-session`, {
        data: { cart, user },
      });

      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result.user).toBeTruthy();
      expect(result.user.email).toBe('test@example.com');
    });

    test('seeds shipping method', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'seed-session can set shipping method',
        tags: ['@debug', '@teleport'],
        name: 'Shipping method seeding',
      });

      const cart: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', price: 8900, name: "Test Item", quantity: 1, weightInKg: 0.1 },
      ];

      const response = await request.post(`${API_BASE}/seed-session`, {
        data: { cart, shippingMethod: 'EXPRESS' },
      });

      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result.shippingMethod).toBe('EXPRESS');
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
  });

  test.describe('POST /api/debug/seed-auth', () => {
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

  test.describe('POST /api/debug/reset', () => {
    test('resets state', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/05-debug-page.md',
        rule: 'reset clears all state',
        tags: ['@debug', '@reset'],
        name: 'State reset',
      });

      // Call reset
      const response = await request.post(`${API_BASE}/reset`);
      expect(response.status()).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.items.length).toBe(0);
      expect(result.user).toBeNull();
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

      // Verify all return success
      expect(await response1.json()).toMatchObject({ success: true });
      expect(await response2.json()).toMatchObject({ success: true });
    });
  });
});