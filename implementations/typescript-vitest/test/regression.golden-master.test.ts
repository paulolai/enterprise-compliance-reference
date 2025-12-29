import { describe, it, expect } from 'vitest';
import { PricingEngine } from '../src/pricing-engine';
import { CartItem, User, ShippingMethod} from '../src/types';
import { tracer } from './modules/tracer';

/**
 * Golden Master Testing Pattern
 *
 * This suite stores known-correct outputs for representative inputs.
 * It prevents regression by ensuring the PricingEngine produces identical results
 * for the same inputs over time.
 *
 * Why this matters:
 *  - Invariants prove properties hold (e.g., "discounts never exceed 30%")
 *  - Golden masters prove behavior remains stable (e.g., "specific cart X costs exactly $Y")
 *  - Combined, they provide comprehensive regression protection
 *
 * Regenerating the golden master:
 *  When business rules change, update the expected values in this file and commit.
 *  The diff of this file then becomes the documentation of what changed.
 */

describe('Regression: Golden Master Tests', () => {

  const goldenMasterCases: Array<{
    name: string;
    cart: CartItem[];
    user: User;
    method?: ShippingMethod;
    expected: {
      originalTotal: number;
      volumeDiscountTotal: number;
      subtotalAfterBulk: number;
      vipDiscount: number;
      totalDiscount: number;
      finalTotal: number;
      grandTotal: number;
      isCapped: boolean;
      lineItemFinalPrices: number[];
      shippingTotal: number;
      shippingIsFree: boolean;
    };
  }> = [
    {
      name: 'GM001: Single item, no discounts',
      cart: [{
        sku: 'SINGLE',
        name: 'Single Item',
        price: 10000,
        quantity: 1,
        weightInKg: 1.0
      }],
      user: { tenureYears: 0 },
      method: ShippingMethod.STANDARD,
      expected: {
        originalTotal: 10000,
        volumeDiscountTotal: 0,
        subtotalAfterBulk: 10000,
        vipDiscount: 0,
        totalDiscount: 0,
        finalTotal: 10000,
        grandTotal: 10900, // + base $7 + 1kg*$2 = $9 shipping
        isCapped: false,
        lineItemFinalPrices: [10000],
        shippingTotal: 900,
        shippingIsFree: false
      }
    },
    {
      name: 'GM002: Bulk discount (5 items)',
      cart: [{
        sku: 'BULK_5',
        name: 'Bulk Item',
        price: 10000,
        quantity: 5,
        weightInKg: 1.0
      }],
      user: { tenureYears: 0 },
      method: ShippingMethod.STANDARD,
      expected: {
        originalTotal: 50000,
        volumeDiscountTotal: 7500, // 50K * 15%
        subtotalAfterBulk: 42500,
        vipDiscount: 0,
        totalDiscount: 7500,
        finalTotal: 42500, // Over $100, FREE SHIPPING applies
        grandTotal: 42500,
        isCapped: false,
        lineItemFinalPrices: [42500],
        shippingTotal: 0,
        shippingIsFree: true
      }
    },
    {
      name: 'GM003: VIP discount (3 years, single item)',
      cart: [{
        sku: 'VIP_ITEM',
        name: 'VIP Item',
        price: 10000,
        quantity: 1,
        weightInKg: 1.0
      }],
      user: { tenureYears: 3 },
      method: ShippingMethod.STANDARD,
      expected: {
        originalTotal: 10000,
        volumeDiscountTotal: 0,
        subtotalAfterBulk: 10000,
        vipDiscount: 500, // 10K * 5%
        totalDiscount: 500,
        finalTotal: 9500,
        grandTotal: 10400,
        isCapped: false,
        lineItemFinalPrices: [10000],
        shippingTotal: 900,
        shippingIsFree: false
      }
    },
    {
      name: 'GM004: Bulk + VIP combined',
      cart: [{
        sku: 'BULK_VIP',
        name: 'Bulk VIP Item',
        price: 10000,
        quantity: 5,
        weightInKg: 1.0
      }],
      user: { tenureYears: 5 },
      method: ShippingMethod.STANDARD,
      expected: {
        originalTotal: 50000,
        volumeDiscountTotal: 7500, // 50K * 15%
        subtotalAfterBulk: 42500,
        vipDiscount: 2125, // 42500 * 5% = 2125
        totalDiscount: 9625, // 7500 + 2125 = 9625 (19.25%)
        finalTotal: 40375, // Over $100, FREE SHIPPING applies
        grandTotal: 40375,
        isCapped: false,
        lineItemFinalPrices: [42500],
        shippingTotal: 0,
        shippingIsFree: true
      }
    },
    {
      name: 'GM005: Free shipping threshold (exactly $100)',
      cart: [{
        sku: 'EXACTLY_100',
        name: 'Exactly $100',
        price: 10000,
        quantity: 1,
        weightInKg: 1.0
      }],
      user: { tenureYears: 0 },
      method: ShippingMethod.STANDARD,
      expected: {
        originalTotal: 10000,
        volumeDiscountTotal: 0,
        subtotalAfterBulk: 10000,
        vipDiscount: 0,
        totalDiscount: 0,
        finalTotal: 10000,
        grandTotal: 10900,
        isCapped: false,
        lineItemFinalPrices: [10000],
        shippingTotal: 900,
        shippingIsFree: false // Exactly $100 does NOT qualify
      }
    },
    {
      name: 'GM006: Free shipping threshold (just over $100)',
      cart: [{
        sku: 'JUST_OVER_100',
        name: 'Just over $100',
        price: 10001,
        quantity: 1,
        weightInKg: 1.0
      }],
      user: { tenureYears: 0 },
      method: ShippingMethod.STANDARD,
      expected: {
        originalTotal: 10001,
        volumeDiscountTotal: 0,
        subtotalAfterBulk: 10001,
        vipDiscount: 0,
        totalDiscount: 0,
        finalTotal: 10001,
        grandTotal: 10001,
        isCapped: false,
        lineItemFinalPrices: [10001],
        shippingTotal: 0,
        shippingIsFree: true // Just over $100
      }
    },
    {
      name: 'GM007: Bulk + VIP + Free shipping',
      cart: [{
        sku: 'ALL_BENEFITS',
        name: 'All Benefits',
        price: 25000, // $250 per item
        quantity: 5, // Total $1250, bulk discount
        weightInKg: 1.0
      }],
      user: { tenureYears: 5 }, // VIP
      method: ShippingMethod.STANDARD,
      expected: {
        originalTotal: 125000,
        volumeDiscountTotal: 18750, // 125K * 15%
        subtotalAfterBulk: 106250,
        vipDiscount: 5313, // 106250 * 5% = 5312.5 -> 5313
        totalDiscount: 24063, // 18750 + 5313 = 24063 (19.25%)
        finalTotal: 100937,
        grandTotal: 100937,
        isCapped: false,
        lineItemFinalPrices: [106250],
        shippingTotal: 0,
        shippingIsFree: true // Over $100 after discounts
      }
    },
    {
      name: 'GM008: Express delivery ($25 flat)',
      cart: [{
        sku: 'EXPRESS_ITEM',
        name: 'Express Item',
        price: 100000, // $1000 cart
        quantity: 1,
        weightInKg: 10.0
      }],
      user: { tenureYears: 0 },
      method: ShippingMethod.EXPRESS,
      expected: {
        originalTotal: 100000,
        volumeDiscountTotal: 0,
        subtotalAfterBulk: 100000,
        vipDiscount: 0,
        totalDiscount: 0,
        finalTotal: 100000,
        grandTotal: 102500,
        isCapped: false,
        lineItemFinalPrices: [100000],
        shippingTotal: 2500,
        shippingIsFree: false // Express never free
      }
    },
    {
      name: 'GM009: Expedited delivery (standard + 15% of original)',
      cart: [{
        sku: 'EXPEDITED_ITEM',
        name: 'Expedited Item',
        price: 5000,
        quantity: 1,
        weightInKg: 5.0
      }],
      user: { tenureYears: 0 },
      method: ShippingMethod.EXPEDITED,
      expected: {
        originalTotal: 5000,
        volumeDiscountTotal: 0,
        subtotalAfterBulk: 5000,
        vipDiscount: 0,
        totalDiscount: 0,
        finalTotal: 5000,
        grandTotal: 7450,
        isCapped: false,
        lineItemFinalPrices: [5000],
        shippingTotal: 2450, // Base $7 + (5kg * $2) + 15% of $5000$ = $7 + $10 + $7.50 = $24.50
        shippingIsFree: false
      }
    },
    {
      name: 'GM010: Multiple mixed items',
      cart: [
        {
          sku: 'BULK_ITEM_1',
          name: 'Bulk Item 1',
          price: 10000,
          quantity: 5, // Bulk
          weightInKg: 1.0
        },
        {
          sku: 'SINGLE_ITEM',
          name: 'Single Item',
          price: 5000,
          quantity: 1, // No bulk
          weightInKg: 2.0
        },
        {
          sku: 'BULK_ITEM_2',
          name: 'Bulk Item 2',
          price: 8000,
          quantity: 3, // Bulk
          weightInKg: 0.5
        }
      ],
      user: { tenureYears: 4 }, // VIP
      method: ShippingMethod.STANDARD,
      expected: {
        originalTotal: 79000, // 5*10000 + 1*5000 + 3*8000
        volumeDiscountTotal: 11100, // 15% on 50000 (7500) + 15% on 24000 (3600) = 11100
        subtotalAfterBulk: 67900, // 79000 - 11100
        vipDiscount: 3395, // 67900 * 5% = 3395
        totalDiscount: 14495, // 11100 + 3395
        finalTotal: 64505, // Over $100, FREE SHIPPING applies
        grandTotal: 64505,
        isCapped: false,
        lineItemFinalPrices: [42500, 5000, 20400], // After bulk: 50000-7500, 5000-0, 24000-3600
        shippingTotal: 0,
        shippingIsFree: true
      }
    }
  ];

  /**
   * Run all golden master cases
   * If any fail, this indicates a behavioral change that needs review
   */
  goldenMasterCases.forEach((testCase, index) => {
    it(`GM${String(index + 1).padStart(3, '0')}: ${testCase.name}`, () => {
      const result = PricingEngine.calculate(testCase.cart, testCase.user, testCase.method);
      tracer.log(expect.getState().currentTestName!, { items: testCase.cart, user: testCase.user, method: testCase.method }, result);

      expect(result.originalTotal).toBe(testCase.expected.originalTotal);
      expect(result.volumeDiscountTotal).toBe(testCase.expected.volumeDiscountTotal);
      expect(result.subtotalAfterBulk).toBe(testCase.expected.subtotalAfterBulk);
      expect(result.vipDiscount).toBe(testCase.expected.vipDiscount);
      expect(result.totalDiscount).toBe(testCase.expected.totalDiscount);
      expect(result.finalTotal).toBe(testCase.expected.finalTotal);
      expect(result.grandTotal).toBe(testCase.expected.grandTotal);
      expect(result.isCapped).toBe(testCase.expected.isCapped);
      expect(result.shipment.totalShipping).toBe(testCase.expected.shippingTotal);
      expect(result.shipment.isFreeShipping).toBe(testCase.expected.shippingIsFree);

      // Verify line item after-bulk prices match
      const lineItemTotalAfterBulk = result.lineItems.map(li => li.totalAfterBulk);
      expect(lineItemTotalAfterBulk).toEqual(testCase.expected.lineItemFinalPrices);
    });
  });

  /**
   * Validates: Integer precision boundary cases
   * Ensures rounding is handled consistently
   */
  describe('Golden Master: Precision Boundary Cases', () => {
    it('GM011: Odd prices result in integer values (no floating point)', () => {
      const cart: CartItem[] = [{
        sku: 'ODD_PRICE',
        name: 'Odd Price',
        price: 12345, // $123.45
        quantity: 7,
        weightInKg: 1.5
      }];
      const user: User = { tenureYears: 3 };

      const result = PricingEngine.calculate(cart, user);
      tracer.log(expect.getState().currentTestName!, { items: cart, user }, result);

      // All values should be integers
      expect(Number.isInteger(result.originalTotal)).toBe(true);
      expect(Number.isInteger(result.volumeDiscountTotal)).toBe(true);
      expect(Number.isInteger(result.vipDiscount)).toBe(true);
      expect(Number.isInteger(result.totalDiscount)).toBe(true);
      expect(Number.isInteger(result.finalTotal)).toBe(true);
      expect(Number.isInteger(result.grandTotal)).toBe(true);

      // Golden master for this specific case
      expect(result.originalTotal).toBe(86415); // 12345 * 7
      expect(result.volumeDiscountTotal).toBe(12962); // 86415 * 0.15 = 12962.25 -> 12962
      expect(result.subtotalAfterBulk).toBe(73453);
      expect(result.vipDiscount).toBe(3673); // 73453 * 0.05 = 3672.65 -> 3673
      expect(result.totalDiscount).toBe(16635);
      expect(result.finalTotal).toBe(69780);
    });
  });

  /**
   * Validates: Boundary conditions that shouldn't change
   * These are critical edge cases that must remain stable
   */
  describe('Golden Master: Critical Boundary Cases', () => {
    it('GM012: Exactly 3 items (bulk threshold) behavior is stable', () => {
      const cart: CartItem[] = [{
        sku: 'EXACTLY_3',
        name: 'Exactly 3',
        price: 10000,
        quantity: 3,
        weightInKg: 1.0
      }];
      const user: User = { tenureYears: 0 };

      const result = PricingEngine.calculate(cart, user);
      tracer.log(expect.getState().currentTestName!, { items: cart, user }, result);

      expect(result.volumeDiscountTotal).toBe(4500); // 30K * 0.15
      expect(result.finalTotal).toBe(25500);
    });

    it('GM013: Exactly 2 years tenure (VIP threshold) behavior is stable', () => {
      const cart: CartItem[] = [{
        sku: 'ITEM',
        name: 'Item',
        price: 10000,
        quantity: 1,
        weightInKg: 1.0
      }];
      const user: User = { tenureYears: 2 }; // Exactly at threshold (NOT eligible)

      const result = PricingEngine.calculate(cart, user);
      tracer.log(expect.getState().currentTestName!, { items: cart, user }, result);

      expect(result.vipDiscount).toBe(0);
      expect(result.finalTotal).toBe(10000);
    });

    it('GM014: Exactly $100 cart (free shipping threshold) behavior is stable', () => {
      const cart: CartItem[] = [{
        sku: 'EXACTLY_100',
        name: 'Exactly $100',
        price: 10000,
        quantity: 1,
        weightInKg: 1.0
      }];
      const user: User = { tenureYears: 0 };

      const result = PricingEngine.calculate(cart, user, ShippingMethod.STANDARD);
      tracer.log(expect.getState().currentTestName!, { items: cart, user, method: ShippingMethod.STANDARD }, result);

      expect(result.shipment.isFreeShipping).toBe(false); // Exactly $100 does NOT qualify
      expect(result.shipment.totalShipping).toBe(900);
    });
  });

  /**
   * Documentation: How to update golden masters
   *
   * When business rules change and new golden master values are needed:
   *
   * 1. Run the failing test to see the new expected value
   * 2. Update the `expected` object in the goldenMasterCases array
   * 3. Verify the change makes business sense
   * 4. Commit - the diff documents the change
   * 5. The PR reviewer will see exactly what changed and why
   *
   * Example commit message:
   *   "Update golden master for free shipping threshold change
   *    Changed from $100 to $150 minimum for free shipping
   *    affects GM005, GM006, GM007"
   *
   * This provides traceability: Strategy -> Tests -> Golden Masters -> Production
   */
});
