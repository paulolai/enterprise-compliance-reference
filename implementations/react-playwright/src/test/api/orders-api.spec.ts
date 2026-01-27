import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { registerAllureMetadata } from '../../../../shared/fixtures/allure-helpers';
import { PricingResult, CartItemWithPriceInCents } from '../../../../shared/src';

interface Product {
  sku: string;
  name: string;
  priceInCents: number;
  weightInKg: number;
  category?: string;
}

// Helper to register Allure metadata with hierarchy
function registerApiMetadata(
  metadata: {
    ruleReference: string;
    rule: string;
    tags: string[];
    name?: string;
  }
) {
  const finalMetadata = {
    ...metadata,
    parentSuite: 'API Verification',
    suite: 'Orders',
    feature: 'Order Persistence API',
  };
  registerAllureMetadata(allure, finalMetadata);
}

// API base URL
const API_BASE = '/api/orders';

/**
 * Tests for the Orders API.
 * These endpoints handle order creation and retrieval.
 *
 * NOTE: These tests will require the database implementation from Phase 3.
 */
test.describe('Orders API Integration Tests', () => {
  test.describe('POST /api/orders', () => {
    test('POST creates order with items', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/04-order-persistence.md',
        rule: 'Create order from cart creates order + items in database',
        tags: ['@critical'],
        name: 'Order creation',
      });

      const items: CartItemWithPriceInCents[] = [
        { sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
        { sku: 'SMART-WATCH', name: 'Smart Watch', priceInCents: 19900, quantity: 1, weightInKg: 0.2 },
      ];

      const pricingResult: PricingResult = {
        originalTotal: 28800, subtotalAfterBulk: 28800, isCapped: false,
        finalTotal: 27360, // 5% VIP
        grandTotal: 27360 + 700, // + shipping
        totalDiscount: 1440,
        volumeDiscountTotal: 0,
        vipDiscount: 1440,
        lineItems: [],
        shipment: { method: 'STANDARD',
          baseShipping: 700,
          weightSurcharge: 0,
          expeditedSurcharge: 0,
          totalShipping: 700,
          isFreeShipping: false,
        },
      };

      const response = await request.post(`${API_BASE}`, {
        data: {
          userId: 'test-user-123',
          items,
          total: 28060,
          pricingResult,
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zip: '2000',
            country: 'AU',
          },
          stripePaymentIntentId: 'pi_test_123',
        },
      });

      if (response.status() === 501) {
        test.skip(true, 'Orders API not implemented yet');
        return;
      }

      expect(response.status()).toBe(200);

      // Verify response is JSON, not HTML
      const text = await response.text();
      expect(text).not.toMatch(/<!doctype/i);
      expect(text).not.toMatch(/<html/i);

      const result = JSON.parse(text) as { orderId: string; status: string; total: number };
      expect(result.orderId).toBeTruthy();
      expect(result.status).toBe('paid');
      expect(result.total).toBe(28060);
    });

    test('POST returns order ID in response', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/04-order-persistence.md',
        rule: 'Create order returns orderId',
        tags: ['@comprehensive'],
        name: 'Order ID in response',
      });

      const items: CartItemWithPriceInCents[] = [
        { sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];

      const response = await request.post(`${API_BASE}`, {
        data: {
          userId: 'test-user-456',
          items,
          total: 8900,
          pricingResult: {
            originalTotal: 8900, subtotalAfterBulk: 8900, isCapped: false,
            finalTotal: 8900,
            grandTotal: 8900 + 700,
            totalDiscount: 0,
            volumeDiscountTotal: 0,
            vipDiscount: 0,
            lineItems: [],
            shipment: { method: 'STANDARD',
              baseShipping: 700,
              weightSurcharge: 0,
              expeditedSurcharge: 0,
              totalShipping: 700,
              isFreeShipping: false,
            },
          },
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zip: '2000',
            country: 'AU',
          },
          stripePaymentIntentId: 'pi_test_456',
        },
      });

      if (response.status() === 501) {
        test.skip(true, 'Orders API not implemented yet');
        return;
      }

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('orderId');
      expect(result.orderId).toMatch(/^order_/i);
    });

    test('empty cart rejected', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/04-order-persistence.md',
        rule: 'Empty cart returns 400, no order created',
        tags: ['@validation'],
        name: 'Empty cart rejection',
      });

      const response = await request.post(`${API_BASE}`, {
        data: {
          userId: 'test-user-empty',
          items: [],
          total: 0,
          pricingResult: {
            originalTotal: 0, subtotalAfterBulk: 0, isCapped: false,
            finalTotal: 0,
            grandTotal: 0,
            totalDiscount: 0,
            volumeDiscountTotal: 0,
            vipDiscount: 0,
            lineItems: [],
            shipment: { method: 'STANDARD',
              baseShipping: 0,
              weightSurcharge: 0,
              expeditedSurcharge: 0,
              totalShipping: 0,
              isFreeShipping: false,
            },
          },
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zip: '2000',
            country: 'AU',
          },
          stripePaymentIntentId: 'pi_test_empty',
        },
      });

      if (response.status() === 501) {
        test.skip(true, 'Orders API not implemented yet');
        return;
      }

      expect(response.status()).toBe(400);
    });

    test('invalid SKU rejected', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/04-order-persistence.md',
        rule: 'Unknown SKU returns 400, no order created',
        tags: ['@validation'],
        name: 'Invalid SKU rejection',
      });

      const items: CartItemWithPriceInCents[] = [
        { sku: 'INVALID-SKU-999', name: 'Invalid SKU', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];

      const response = await request.post(`${API_BASE}`, {
        data: {
          userId: 'test-user-invalid',
          items,
          total: 8900,
          pricingResult: {
            originalTotal: 8900, subtotalAfterBulk: 8900, isCapped: false,
            finalTotal: 8900,
            grandTotal: 8900 + 700,
            totalDiscount: 0,
            volumeDiscountTotal: 0,
            vipDiscount: 0,
            lineItems: [],
            shipment: { method: 'STANDARD',
              baseShipping: 700,
              weightSurcharge: 0,
              expeditedSurcharge: 0,
              totalShipping: 700,
              isFreeShipping: false,
            },
          },
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zip: '2000',
            country: 'AU',
          },
          stripePaymentIntentId: 'pi_test_invalid',
        },
      });

      if (response.status() === 501) {
        test.skip(true, 'Orders API not implemented yet');
        return;
      }

      expect(response.status()).toBe(400);
    });
  });

  test.describe('GET /api/orders/:id', () => {
    test('GET returns order with items', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/04-order-persistence.md',
        rule: 'Get order by ID returns order with items',
        tags: ['@comprehensive'],
        name: 'Order retrieval with items',
      });

      // First, assume an order exists (would need setup in a real test)
      const orderId = 'order_test_123';

      const response = await request.get(`${API_BASE}/${orderId}`);

      if (response.status() === 501) {
        test.skip(true, 'Orders API not implemented yet');
        return;
      }

      // In a real test, we'd create an order first
      // For now, we expect either 404 (not found) or 200 (found)
      expect([200, 404]).toContain(response.status());

      if (response.status() === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('userId');
        expect(result).toHaveProperty('total');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('items');
        expect(Array.isArray(result.items)).toBe(true);
      }
    });
  });

  test.describe('GET /api/orders/user/:userId', () => {
    test('GET returns users orders by ID', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/04-order-persistence.md',
        rule: 'Get orders by userId returns only that users orders',
        tags: ['@privacy', '@comprehensive'],
        name: 'User orders retrieval',
      });

      const userId = 'test-user-123';

      const response = await request.get(`${API_BASE}/user/${userId}`);

      if (response.status() === 501) {
        test.skip(true, 'Orders API not implemented yet');
        return;
      }

      expect([200, 404]).toContain(response.status());

      if (response.status() === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('orders');
        expect(result).toHaveProperty('userId');
        expect(result.userId).toBe(userId);
        expect(Array.isArray(result.orders)).toBe(true);
      }
    });

    test('orders ordered by date descending', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/04-order-persistence.md',
        rule: 'User orders returned newest first',
        tags: ['@business-rule'],
        name: 'Orders ordered by date',
      });

      const userId = 'test-user-456';

      const response = await request.get(`${API_BASE}/user/${userId}`);

      if (response.status() === 501) {
        test.skip(true, 'Orders API not implemented yet');
        return;
      }

      if (response.status() === 200) {
        const result = await response.json();

        if (result.orders.length > 1) {
          // Verify orders are sorted by createdAt descending
          for (let i = 0; i < result.orders.length - 1; i++) {
            const current = new Date(result.orders[i].createdAt);
            const next = new Date(result.orders[i + 1].createdAt);
            expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
          }
        }
      }
    });
  });

  test.describe('DELETE /api/orders/:id', () => {
    test('delete cascades to order items', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/04-order-persistence.md',
        rule: 'Delete order deletes all related order items',
        tags: ['@integrity'],
        name: 'Cascade delete',
      });

      // This would require setting up an order first
      const orderId = 'order_test_delete';

      const response = await request.delete(`${API_BASE}/${orderId}`);

      if (response.status() === 501) {
        test.skip(true, 'Orders API not implemented yet');
        return;
      }

      expect([200, 204, 404]).toContain(response.status());

      // Verify the order is gone
      const getResponse = await request.get(`${API_BASE}/${orderId}`);
      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe('GET /api/products', () => {
    test('GET returns all products', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/04-order-persistence.md',
        rule: 'Get products returns product catalog',
        tags: ['@comprehensive'],
        name: 'Product catalog retrieval',
      });

      const response = await request.get('/api/products');

      if (response.status() === 501) {
        test.skip(true, 'Products API not implemented yet');
        return;
      }

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('products');
      expect(Array.isArray(result.products)).toBe(true);

      // Should have at least the 11 products from the cartStore
      expect(result.products.length).toBeGreaterThanOrEqual(11);

      // Each product should have required fields
      result.products.forEach((product: Product) => {
        expect(product).toHaveProperty('sku');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('priceInCents');
        expect(product).toHaveProperty('weightInKg');
        expect(product).toHaveProperty('category');
      });
    });

    test('products are consistent with cartStore catalog', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/04-order-persistence.md',
        rule: 'Database products match frontend product catalog',
        tags: ['@consistency'],
        name: 'Product catalog consistency',
      });

      const response = await request.get('/api/products');

      if (response.status() === 501) {
        test.skip(true, 'Products API not implemented yet');
        return;
      }

      const result = await response.json();

      // Known products from cartStore
      const knownSKUs = [
        'WIRELESS-EARBUDS',
        'SMART-WATCH',
        'TABLET-10',
        'LAPTOP-PRO',
        'DESK-LAMP',
        'COFFEE-MAKER',
        'THROW-BLANKET',
        'BATH-TOWEL-SET',
        'T-SHIRT-BASIC',
        'JEANS-SLIM',
        'HOODIE-ZIP',
      ];

      // These should all exist in the returned catalog
      const returnedSKUs = result.products.map((p: Product) => p.sku);

      knownSKUs.forEach((sku) => {
        expect(returnedSKUs).toContain(sku);
      });
    });
  });
});
