import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { registerAllureMetadata } from '../../../shared/fixtures/allure-helpers';
import type { PricingResult, CartItemWithPriceInCents } from '@executable-specs/shared';

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
            fullName: 'Test User',
            streetAddress: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zipCode: '2000',
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
            fullName: 'Test User',
            streetAddress: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zipCode: '2000',
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
            fullName: 'Test User',
            streetAddress: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zipCode: '2000',
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
            fullName: 'Test User',
            streetAddress: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zipCode: '2000',
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

      const items: CartItemWithPriceInCents[] = [
        { sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
        { sku: 'SMART-WATCH', name: 'Smart Watch', priceInCents: 19900, quantity: 1, weightInKg: 0.2 },
      ];

      const pricingResult: PricingResult = {
        originalTotal: 28800, subtotalAfterBulk: 28800, isCapped: false,
        finalTotal: 28800,
        grandTotal: 28800 + 700,
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
      };

      const createResponse = await request.post(API_BASE, {
        data: {
          userId: 'test-user-get-order',
          items,
          total: 29500,
          pricingResult,
          shippingAddress: {
            fullName: 'Test User',
            streetAddress: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zipCode: '2000',
            country: 'AU',
          },
          stripePaymentIntentId: 'pi_test_get_order',
        },
      });

      if (createResponse.status() === 501) {
        test.skip(true, 'Orders API not implemented yet');
        return;
      }

      expect(createResponse.status()).toBe(200);
      const createResult = await createResponse.json() as { orderId: string };
      const orderId = createResult.orderId;

      const response = await request.get(`${API_BASE}/${orderId}`);
      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('id');
      expect(result.id).toBe(orderId);
      expect(result).toHaveProperty('userId');
      expect(result.userId).toBe('test-user-get-order');
      expect(result).toHaveProperty('total');
      expect(result.total).toBe(29500);
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('paid');
      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBe(2);
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

      const userId = 'test-user-orders-list';
      const items: CartItemWithPriceInCents[] = [
        { sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];

      const pricingResult: PricingResult = {
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
      };

      const createResponse = await request.post(API_BASE, {
        data: {
          userId,
          items,
          total: 9600,
          pricingResult,
          shippingAddress: {
            fullName: 'Test User',
            streetAddress: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zipCode: '2000',
            country: 'AU',
          },
          stripePaymentIntentId: 'pi_test_user_orders_list',
        },
      });

      if (createResponse.status() === 501) {
        test.skip(true, 'Orders API not implemented yet');
        return;
      }

      expect(createResponse.status()).toBe(200);

      const response = await request.get(`${API_BASE}/user/${userId}`);
      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('orders');
      expect(result).toHaveProperty('userId');
      expect(result.userId).toBe(userId);
      expect(Array.isArray(result.orders)).toBe(true);
      expect(result.orders.length).toBeGreaterThanOrEqual(1);
    });

    test('orders ordered by date descending', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/04-order-persistence.md',
        rule: 'User orders returned newest first',
        tags: ['@business-rule'],
        name: 'Orders ordered by date',
      });

      const userId = 'test-user-sorting';
      const items: CartItemWithPriceInCents[] = [
        { sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];

      const pricingResult: PricingResult = {
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
      };

      const paymentIntents = ['pi_sort_1', 'pi_sort_2', 'pi_sort_3'];
      const totals = [9600, 9601, 9602];
      const createdOrderIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        const createResponse = await request.post(API_BASE, {
          data: {
            userId,
            items,
            total: totals[i],
            pricingResult,
            shippingAddress: {
              fullName: 'Test User',
              streetAddress: '123 Test St',
              city: 'Test City',
              state: 'NSW',
              zipCode: '2000',
              country: 'AU',
            },
            stripePaymentIntentId: paymentIntents[i],
          },
        });

        if (createResponse.status() === 501) {
          test.skip(true, 'Orders API not implemented yet');
          return;
        }

        expect(createResponse.status()).toBe(200);
        const createResult = await createResponse.json() as { orderId: string };
        createdOrderIds.push(createResult.orderId);

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const response = await request.get(`${API_BASE}/user/${userId}`);
      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(Array.isArray(result.orders)).toBe(true);
      expect(result.orders.length).toBeGreaterThanOrEqual(3);

      const userOrders = result.orders.filter((o: { id: string }) => createdOrderIds.includes(o.id));
      expect(userOrders.length).toBe(3);

      // Verify descending order: last-created order (total=9602) should be first
      expect(userOrders[0].total).toBe(9602);
      expect(userOrders[1].total).toBe(9601);
      expect(userOrders[2].total).toBe(9600);

      // Also verify createdAt timestamps are descending
      for (let i = 0; i < userOrders.length - 1; i++) {
        const current = new Date(userOrders[i].createdAt);
        const next = new Date(userOrders[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
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

      const items: CartItemWithPriceInCents[] = [
        { sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
        { sku: 'SMART-WATCH', name: 'Smart Watch', priceInCents: 19900, quantity: 1, weightInKg: 0.2 },
      ];

      const pricingResult: PricingResult = {
        originalTotal: 28800, subtotalAfterBulk: 28800, isCapped: false,
        finalTotal: 28800,
        grandTotal: 28800 + 700,
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
      };

      const createResponse = await request.post(API_BASE, {
        data: {
          userId: 'test-user-delete',
          items,
          total: 29500,
          pricingResult,
          shippingAddress: {
            fullName: 'Test User',
            streetAddress: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zipCode: '2000',
            country: 'AU',
          },
          stripePaymentIntentId: 'pi_test_delete_cascade',
        },
      });

      if (createResponse.status() === 501) {
        test.skip(true, 'Orders API not implemented yet');
        return;
      }

      expect(createResponse.status()).toBe(200);
      const createResult = await createResponse.json() as { orderId: string };
      const orderId = createResult.orderId;

      const getOrderResponse = await request.get(`${API_BASE}/${orderId}`);
      expect(getOrderResponse.status()).toBe(200);
      const getOrderResult = await getOrderResponse.json();
      expect(Array.isArray(getOrderResult.items)).toBe(true);
      expect(getOrderResult.items.length).toBe(2);

      const deleteResponse = await request.delete(`${API_BASE}/${orderId}`);
      expect(deleteResponse.status()).toBe(200);

      const verifyGetResponse = await request.get(`${API_BASE}/${orderId}`);
      expect(verifyGetResponse.status()).toBe(404);
    });
  });

  test.describe('GET /api/products/:sku', () => {
    test('GET returns product by SKU', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/04-order-persistence.md',
        rule: 'Get product by SKU returns product details',
        tags: ['@comprehensive'],
        name: 'Product retrieval by SKU',
      });

      const response = await request.get('/api/products/WIRELESS-EARBUDS');

      if (response.status() === 501) {
        test.skip(true, 'Products API not implemented yet');
        return;
      }

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('sku');
      expect(result.sku).toBe('WIRELESS-EARBUDS');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('priceInCents');
      expect(result).toHaveProperty('weightInKg');
      expect(result).toHaveProperty('category');
    });

    test('GET returns 404 for unknown SKU', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/04-order-persistence.md',
        rule: 'Get product by unknown SKU returns 404',
        tags: ['@validation'],
        name: 'Product not found by SKU',
      });

      const response = await request.get('/api/products/NONEXISTENT-SKU-999');

      if (response.status() === 501) {
        test.skip(true, 'Products API not implemented yet');
        return;
      }

      expect(response.status()).toBe(404);
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
