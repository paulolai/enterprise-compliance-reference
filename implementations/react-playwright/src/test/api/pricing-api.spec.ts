import { test, expect, APIRequestContext } from '@playwright/test';
import { allure } from 'allure-playwright';
import { registerAllureMetadata } from '../../../../shared/fixtures/allure-helpers';
import { PricingEngine, CartItem, User, ShippingMethod } from '../../../../shared/src';

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
    suite: 'Pricing',
    feature: 'Pricing API Integration',
  };
  registerAllureMetadata(allure, finalMetadata);
}

// API base URL
const API_BASE = '/api/pricing';

/**
 * Verifies that the API returns correct calculation matching PricingEngine
 */
test.describe('Pricing API Integration Tests', () => {
  test('API returns correct calculation matching PricingEngine', async ({ request }) => {
    registerApiMetadata({
      ruleReference: 'pricing-strategy.md §1 - Base Rules',
      rule: 'API calculation matches PricingEngine.calculate() exactly',
      tags: ['@critical', '@compliance'],
      name: 'API matches PricingEngine',
    });

    const items: CartItem[] = [
      { sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 2, weightInKg: 0.1 },
    ];
    const user: User = { tenureYears: 0 };
    const method = ShippingMethod.STANDARD;

    // Get API result
    const apiResponse = await request.post(`${API_BASE}/calculate`, {
      data: { items, user, method },
    });
    const apiResult = await apiResponse.json();

    // Get PricingEngine result
    const engineResult = PricingEngine.calculate(items, user, method);

    // They should be identical
    expect(apiResponse.status()).toBe(200);
    expect(apiResult).toEqual(engineResult);
  });

  test('API validates input - invalid SKU returns 400', async ({ request }) => {
    registerApiMetadata({
      ruleReference: 'docs/specs/stories/01-pricing-calculation.md',
      rule: 'API returns 400 with schema error for invalid SKU',
      tags: ['@validation'],
      name: 'Invalid SKU validation',
    });

    const response = await request.post(`${API_BASE}/calculate`, {
      data: {
        items: [{ sku: '', priceInCents: 8900, quantity: 1, weightInKg: 0.1 }],
        user: { tenureYears: 0 },
        method: 'STANDARD',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('API validates input - negative quantity returns 400', async ({ request }) => {
    registerApiMetadata({
      ruleReference: 'docs/specs/stories/01-pricing-calculation.md',
      rule: 'API returns 400 with schema error for negative quantity',
      tags: ['@validation'],
      name: 'Negative quantity validation',
    });

    const response = await request.post(`${API_BASE}/calculate`, {
      data: {
        items: [{ sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: -1, weightInKg: 0.1 }],
        user: { tenureYears: 0 },
        method: 'STANDARD',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('API handles empty cart gracefully', async ({ request }) => {
    registerApiMetadata({
      ruleReference: 'docs/specs/stories/01-pricing-calculation.md',
      rule: 'Empty cart returns valid zero result',
      tags: ['@boundary'],
      name: 'Empty cart handling',
    });

    const items: CartItem[] = [];
    const user: User = { tenureYears: 0 };
    const method = ShippingMethod.STANDARD;

    const response = await request.post(`${API_BASE}/calculate`, {
      data: { items, user, method },
    });

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.originalTotal).toBe(0);
    expect(result.finalTotal).toBe(0);
  });

  test('API correctly applies VIP discount', async ({ request }) => {
    registerApiMetadata({
      ruleReference: 'pricing-strategy.md §3 - VIP Tier',
      rule: 'Customer with tenure > 2 gets VIP discount',
      tags: ['@business-rule'],
      name: 'VIP discount applied',
    });

    const items: CartItem[] = [
      { sku: 'WIRELESS-EARBUDS', priceInCents: 10000, quantity: 1, weightInKg: 0.1 },
    ];

    // Non-VIP user
    const noVipResponse = await request.post(`${API_BASE}/calculate`, {
      data: { items, user: { tenureYears: 1 }, method: ShippingMethod.STANDARD },
    });
    const noVipResult = await noVipResponse.json();

    // VIP user
    const vipResponse = await request.post(`${API_BASE}/calculate`, {
      data: { items, user: { tenureYears: 3 }, method: ShippingMethod.STANDARD },
    });
    const vipResult = await vipResponse.json();

    // VIP should have higher discount
    expect(vipResult.totalDiscount).toBeGreaterThan(noVipResult.totalDiscount);
    expect(vipResult.finalTotal).toBeLessThan(noVipResult.finalTotal);
  });

  test('API correctly applies bulk discount', async ({ request }) => {
    registerApiMetadata({
      ruleReference: 'pricing-strategy.md §2 - Bulk Discounts',
      rule: '3+ same SKU gets 15% discount',
      tags: ['@business-rule'],
      name: 'Bulk discount applied',
    });

    // 2 items - no bulk discount
    const noBulkItems: CartItem[] = [
      { sku: 'WIRELESS-EARBUDS', priceInCents: 10000, quantity: 2, weightInKg: 0.1 },
    ];
    const noBulkResponse = await request.post(`${API_BASE}/calculate`, {
      data: { items: noBulkItems, user: { tenureYears: 0 }, method: ShippingMethod.STANDARD },
    });
    const noBulkResult = await noBulkResponse.json();

    // 3 items - bulk discount applies
    const bulkItems: CartItem[] = [
      { sku: 'WIRELESS-EARBUDS', priceInCents: 10000, quantity: 3, weightInKg: 0.1 },
    ];
    const bulkResponse = await request.post(`${API_BASE}/calculate`, {
      data: { items: bulkItems, user: { tenureYears: 0 }, method: ShippingMethod.STANDARD },
    });
    const bulkResult = await bulkResponse.json();

    // Bulk should have discount
    expect(bulkResult.totalDiscount).toBeGreaterThan(noBulkResult.totalDiscount);
    expect(bulkResult.finalTotal).toBeLessThan(noBulkResult.finalTotal);

    // Exactly 15% bulk discount
    const expectedBulkDiscount = Math.floor(30000 * 0.15); // 30,000 * 15%
    expect(bulkResult.volumeDiscountTotal).toBe(expectedBulkDiscount);
  });

  test('API enforces 30% discount cap', async ({ request }) => {
    registerApiMetadata({
      ruleReference: 'pricing-strategy.md §4 - Safety Valve',
      rule: 'Total discount never exceeds 30% of original total',
      tags: ['@safety'],
      name: 'Discount cap enforced',
    });

    // Create a scenario with many items to exceed 30% discount
    const items: CartItem[] = [
      { sku: 'WIRELESS-EARBUDS', priceInCents: 10000, quantity: 5, weightInKg: 0.1 },
      { sku: 'WIRELESS-EARBUDS', priceInCents: 10000, quantity: 5, weightInKg: 0.1 },
    ];
    const user: User = { tenureYears: 5 }; // VIP
    const method = ShippingMethod.STANDARD;

    const response = await request.post(`${API_BASE}/calculate`, {
      data: { items, user, method },
    });

    expect(response.status()).toBe(200);

    const result = await response.json();
    const maxAllowedDiscount = Math.floor(result.originalTotal * 0.30);

    // Total discount should not exceed 30% of original
    expect(result.totalDiscount).toBeLessThanOrEqual(maxAllowedDiscount);
    expect(result.totalDiscount).toBe(maxAllowedDiscount); // Should be capped exactly
  });

  test('API calculates free shipping correctly', async ({ request }) => {
    registerApiMetadata({
      ruleReference: 'pricing-strategy.md §5.2 - Free Shipping Threshold',
      rule: 'Orders > $100 get free standard/expedited shipping',
      tags: ['@business-rule'],
      name: 'Free shipping calculation',
    });

    const baseItems: CartItem[] = [
      { sku: 'TABLET-10', priceInCents: 44900, quantity: 1, weightInKg: 1.2 },
    ];

    // Below threshold - shipping charges apply
    const belowThresholdResponse = await request.post(`${API_BASE}/calculate`, {
      data: { items: baseItems, user: { tenureYears: 0 }, method: ShippingMethod.STANDARD },
    });
    const belowThresholdResult = await belowThresholdResponse.json();

    // Above threshold - free shipping
    const aboveThresholdItems: CartItem[] = [
      { sku: 'TABLET-10', priceInCents: 44900, quantity: 3, weightInKg: 1.2 },
    ];
    const aboveThresholdResponse = await request.post(`${API_BASE}/calculate`, {
      data: { items: aboveThresholdItems, user: { tenureYears: 0 }, method: ShippingMethod.STANDARD },
    });
    const aboveThresholdResult = await aboveThresholdResponse.json();

    // Above threshold should have free shipping
    expect(aboveThresholdResult.shipment.isFreeShipping).toBe(true);
    expect(aboveThresholdResult.shipment.totalShipping).toBe(0);

    // Below threshold should have shipping cost
    expect(belowThresholdResult.shipment.isFreeShipping).toBe(false);
    expect(belowThresholdResult.shipment.totalShipping).toBeGreaterThan(0);
  });

  test('API calculates Express shipping at fixed $25', async ({ request }) => {
    registerApiMetadata({
      ruleReference: 'pricing-strategy.md §5.4 - Express Delivery',
      rule: 'Express delivery is fixed $25 regardless of cart value',
      tags: ['@business-rule'],
      name: 'Express shipping fixed rate',
    });

    const items: CartItem[] = [
      { sku: 'WIRELESS-EARBUDS', priceInCents: 10000, quantity: 1, weightInKg: 0.1 },
    ];

    const response = await request.post(`${API_BASE}/calculate`, {
      data: { items, user: { tenureYears: 0 }, method: ShippingMethod.EXPRESS },
    });

    expect(response.status()).toBe(200);

    const result = await response.json();
    // Express should always be exactly $25.00 = 2500 cents
    expect(result.shipment.totalShipping).toBe(2500);
  });

  test('API calculates Expedited shipping with 15% surcharge', async ({ request }) => {
    registerApiMetadata({
      ruleReference: 'pricing-strategy.md §5.3 - Expedited Shipping',
      rule: 'Expedited surcharge = 15% of original subtotal',
      tags: ['@business-rule'],
      name: 'Expedited shipping calculation',
    });

    const items: CartItem[] = [
      { sku: 'WIRELESS-EARBUDS', priceInCents: 10000, quantity: 2, weightInKg: 0.1 },
    ];

    const response = await request.post(`${API_BASE}/calculate`, {
      data: { items, user: { tenureYears: 0 }, method: ShippingMethod.EXPEDITED },
    });

    expect(response.status()).toBe(200);

    const result = await response.json();

    // Original total = 20,000
    // Expected expedited surcharge = 20,000 * 0.15 = 3,000
    const expectedSurcharge = Math.floor(20000 * 0.15);

    // Verify shipping includes the surcharge
    expect(result.shipment.expeditedSurcharge).toBe(expectedSurcharge);
  });

  test('API handles null user correctly', async ({ request }) => {
    registerApiMetadata({
      ruleReference: 'docs/specs/stories/01-pricing-calculation.md',
      rule: 'Null user treated as non-VIP customer',
      tags: ['@robustness'],
      name: 'Null user handling',
    });

    const items: CartItem[] = [
      { sku: 'WIRELESS-EARBUDS', priceInCents: 10000, quantity: 1, weightInKg: 0.1 },
    ];

    const response = await request.post(`${API_BASE}/calculate`, {
      data: { items, user: null, method: ShippingMethod.STANDARD },
    });

    expect(response.status()).toBe(200);

    const result = await response.json();
    // Null user should have no VIP discount
    expect(result.vipDiscount).toBe(0);
  });

  test('API finalTotal never exceeds originalTotal', async ({ request }) => {
    registerApiMetadata({
      ruleReference: 'pricing-strategy.md §1 - Base Rules',
      rule: 'Final Total <= Original Total (prices never increase)',
      tags: ['@critical', '@compliance'],
      name: 'Revenue protection invariant',
    });

    const testCases: { items: CartItem[]; user: User; method: ShippingMethod }[] = [
      { items: [{ sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 }], user: { tenureYears: 0 }, method: ShippingMethod.STANDARD },
      { items: [{ sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 3, weightInKg: 0.1 }], user: { tenureYears: 0 }, method: ShippingMethod.STANDARD },
      { items: [{ sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 1, weightInKg: 0.1 }], user: { tenureYears: 3 }, method: ShippingMethod.STANDARD },
      { items: [{ sku: 'WIRELESS-EARBUDS', priceInCents: 8900, quantity: 3, weightInKg: 0.1 }], user: { tenureYears: 3 }, method: ShippingMethod.EXPEDITED },
    ];

    for (const testCase of testCases) {
      const response = await request.post(`${API_BASE}/calculate`, {
        data: testCase,
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
    }
  });
});
