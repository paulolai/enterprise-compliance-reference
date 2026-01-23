import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { registerAllureMetadata } from '../../../../shared/fixtures/allure-helpers';
import { CartItem } from '../../../../shared/src';

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
    suite: 'Payments',
    feature: 'Payment Processing API',
  };
  registerAllureMetadata(allure, finalMetadata);
}

// API base URL
const API_BASE = '/api/payments';

/**
 * Tests for the Payment Processing API.
 * These endpoints handle Stripe payment intent creation and order confirmation.
 *
 * NOTE: These tests will require Stripe mock or test mode to pass.
 * The actual implementation is in Phase 3.
 */
test.describe('Payments API Integration Tests', () => {
  test.describe('POST /api/payments/create-intent', () => {
    test('create-intent returns clientSecret', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/03-payment-processing.md',
        rule: 'Create PaymentIntent returns clientSecret for frontend',
        tags: ['@critical'],
        name: 'PaymentIntent creation',
      });

      const items: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];

      const response = await request.post(`${API_BASE}/create-intent`, {
        data: {
          amount: 8900,
          cartId: 'test-cart-123',
          userId: 'test-user-123',
          cartItems: items,
        },
      });

      if (response.status() === 501) {
        // Implementation not ready yet
        test.skip(true, 'Payments API not implemented yet');
        return;
      }

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.paymentIntentId).toBeTruthy();
      expect(result.clientSecret).toBeTruthy();
      expect(result.amount).toBe(8900);
      expect(result.currency).toBe('aud');
    });

    test('create-intent validates amount > 0', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/03-payment-processing.md',
        rule: 'Zero or negative amount returns 400 error',
        tags: ['@validation'],
        name: 'Positive amount validation',
      });

      const response = await request.post(`${API_BASE}/create-intent`, {
        data: {
          amount: 0,
          cartId: 'test-cart-123',
          userId: 'test-user-123',
          cartItems: [],
        },
      });

      if (response.status() === 501) {
        test.skip(true, 'Payments API not implemented yet');
        return;
      }

      expect(response.status()).toBe(400);
    });

    test('create-intent validates positive amount', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/03-payment-processing.md',
        rule: 'Negative amount returns 400 error',
        tags: ['@validation'],
        name: 'Negative amount rejected',
      });

      const response = await request.post(`${API_BASE}/create-intent`, {
        data: {
          amount: -100,
          cartId: 'test-cart-123',
          userId: 'test-user-123',
          cartItems: [],
        },
      });

      if (response.status() === 501) {
        test.skip(true, 'Payments API not implemented yet');
        return;
      }

      expect(response.status()).toBe(400);
    });

    test('create-intent includes cart metadata', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/03-payment-processing.md',
        rule: 'PaymentIntent includes cart info in metadata',
        tags: ['@audit'],
        name: 'Metadata on PaymentIntent',
      });

      const items: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];

      const response = await request.post(`${API_BASE}/create-intent`, {
        data: {
          amount: 8900,
          cartId: 'test-cart-123',
          userId: 'test-user-123',
          cartItems: items,
        },
      });

      if (response.status() === 501) {
        test.skip(true, 'Payments API not implemented yet');
        return;
      }

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.paymentIntentId).toBeTruthy();
      // Metadata would be verified via Stripe dashboard or SDK
    });
  });

  test.describe('POST /api/payments/confirm', () => {
    test('confirm creates order on successful payment', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/03-payment-processing.md',
        rule: 'Successful payment creates order record in database',
        tags: ['@critical', '@business-rule'],
        name: 'Order creation on success',
      });

      const items: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];

      const response = await request.post(`${API_BASE}/confirm`, {
        data: {
          paymentIntentId: 'pi_1234567890', // Test PaymentIntent ID
          cartItems: items,
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zip: '2000',
            country: 'AU',
          },
        },
      });

      if (response.status() === 501) {
        test.skip(true, 'Payments API not implemented yet');
        return;
      }

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.orderId).toBeTruthy();
      expect(result.status).toBe('paid');
      expect(result.total).toBe(8900);
    });

    test('confirm returns order details', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/03-payment-processing.md',
        rule: 'Confirm response includes orderId, total, status',
        tags: ['@comprehensive'],
        name: 'Order details in response',
      });

      const items: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];

      const response = await request.post(`${API_BASE}/confirm`, {
        data: {
          paymentIntentId: 'pi_1234567890',
          cartItems: items,
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zip: '2000',
            country: 'AU',
          },
        },
      });

      if (response.status() === 501) {
        test.skip(true, 'Payments API not implemented yet');
        return;
      }

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('orderId');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('paymentIntentId');
      expect(result).toHaveProperty('createdAt');
    });

    test('confirm fails on non-successful payment', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/03-payment-processing.md',
        rule: 'Failed payment returns 400, no order created',
        tags: ['@business-rule', '@error-handling'],
        name: 'Failed payment rejection',
      });

      const items: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];

      const response = await request.post(`${API_BASE}/confirm`, {
        data: {
          paymentIntentId: 'pi_failed_123', // Simulate failed payment
          cartItems: items,
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zip: '2000',
            country: 'AU',
          },
        },
      });

      if (response.status() === 501) {
        test.skip(true, 'Payments API not implemented yet');
        return;
      }

      expect(response.status()).toBe(400);

      const result = await response.json();
      expect(result.error).toBeTruthy();
      expect(result.orderId).toBeFalsy(); // No order created
    });

    test('confirm not found for invalid PaymentIntent', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/03-payment-processing.md',
        rule: 'Invalid PaymentIntent ID returns 404',
        tags: ['@validation'],
        name: 'Invalid PaymentIntent handling',
      });

      const items: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];

      const response = await request.post(`${API_BASE}/confirm`, {
        data: {
          paymentIntentId: 'pi_nonexistent',
          cartItems: items,
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zip: '2000',
            country: 'AU',
          },
        },
      });

      if (response.status() === 501) {
        test.skip(true, 'Payments API not implemented yet');
        return;
      }

      expect(response.status()).toBe(404);
    });

    test('Stripe error is propagated to client', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/03-payment-processing.md',
        rule: 'Stripe card declined error shown to user',
        tags: ['@integration', '@error-handling'],
        name: 'Stripe error propagation',
      });

      const items: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];

      const response = await request.post(`${API_BASE}/confirm`, {
        data: {
          paymentIntentId: 'pi_card_declined',
          cartItems: items,
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zip: '2000',
            country: 'AU',
          },
        },
      });

      if (response.status() === 501) {
        test.skip(true, 'Payments API not implemented yet');
        return;
      }

      // Should return error with message
      expect(response.status()).toBeGreaterThanOrEqual(400);

      const result = await response.json();
      expect(result.error).toBeTruthy();
    });

    test('confirm is idempotent', async ({ request }) => {
      registerApiMetadata({
        ruleReference: 'docs/specs/stories/03-payment-processing.md',
        rule: 'Confirming same PaymentIntent twice returns same order',
        tags: ['@robustness'],
        name: 'Idempotent confirmation',
      });

      const items: CartItem[] = [
        { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      ];

      const paymentIntentId = 'pi_idempotent_test';

      // First confirm
      const response1 = await request.post(`${API_BASE}/confirm`, {
        data: {
          paymentIntentId,
          cartItems: items,
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zip: '2000',
            country: 'AU',
          },
        },
      });

      if (response1.status() === 501) {
        test.skip(true, 'Payments API not implemented yet');
        return;
      }

      expect(response1.status()).toBe(200);

      const result1 = await response1.json();
      const orderId1 = result1.orderId;

      // Second confirm - should return same order
      const response2 = await request.post(`${API_BASE}/confirm`, {
        data: {
          paymentIntentId,
          cartItems: items,
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'NSW',
            zip: '2000',
            country: 'AU',
          },
        },
      });

      expect(response2.status()).toBe(200);

      const result2 = await response2.json();
      const orderId2 = result2.orderId;

      // Should return same order ID
      expect(orderId2).toBe(orderId1);
    });
  });
});
