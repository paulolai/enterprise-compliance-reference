import { describe, it, expect } from 'vitest';
import { CartBuilder } from './fixtures/cart-builder';
import { ShippingMethod } from '../src/types';

describe('Shipping: Business Specifications', () => {

  describe('1. Standard Shipping ($7 base + $2/kg)', () => {
    it('should calculate standard shipping correctly for a light item', () => {
      const result = CartBuilder.new()
        .withItem({ 
          name: 'Light Item', 
          price: 1000, 
          quantity: 1, 
          sku: 'LIGHT', 
          weightInKg: 0.5 
        })
        .withStandardShipping()
        .calculate(expect.getState().currentTestName);

      expect(result.shipment).toMatchSnapshot();
    });

    it('should calculate standard shipping correctly for a heavy item', () => {
      const result = CartBuilder.new()
        .withItem({ 
          name: 'Heavy Item', 
          price: 1000, 
          quantity: 1, 
          sku: 'HEAVY', 
          weightInKg: 10.0 
        })
        .withStandardShipping()
        .calculate(expect.getState().currentTestName);

      expect(result.shipment).toMatchSnapshot();
    });
  });

  describe('2. Free Shipping (Orders > $100)', () => {
    it('should grant free shipping for orders over $100', () => {
      const result = CartBuilder.new()
        .withItem({ 
          name: 'Expensive Item', 
          price: 10500, 
          quantity: 1, 
          sku: 'EXPENSIVE', 
          weightInKg: 1.0 
        })
        .withStandardShipping()
        .calculate(expect.getState().currentTestName);

      expect(result.shipment.isFreeShipping).toBe(true);
      expect(result.shipment.totalShipping).toBe(0);
      expect(result.shipment).toMatchSnapshot();
    });

    it('should NOT grant free shipping for orders exactly $100', () => {
      const result = CartBuilder.new()
        .withItem({ 
          name: 'Exactly $100', 
          price: 10000, 
          quantity: 1, 
          sku: 'EXACT_100', 
          weightInKg: 1.0 
        })
        .withStandardShipping()
        .calculate(expect.getState().currentTestName);

      expect(result.shipment.isFreeShipping).toBe(false);
      expect(result.shipment).toMatchSnapshot();
    });
  });

  describe('3. Expedited Shipping (Standard + 15% Original Total)', () => {
    it('should calculate expedited shipping correctly', () => {
      const result = CartBuilder.new()
        .withItem({ 
          name: 'Item', 
          price: 5000, 
          quantity: 1, 
          sku: 'ITEM', 
          weightInKg: 1.0 
        })
        .withExpeditedShipping()
        .calculate(expect.getState().currentTestName);

      expect(result.shipment).toMatchSnapshot();
    });
  });

  describe('4. Express Delivery (Fixed $25)', () => {
    it('should always cost $25 regardless of weight or total', () => {
      const result = CartBuilder.new()
        .withItem({ 
          name: 'Heavy Expensive Item', 
          price: 50000, 
          quantity: 1, 
          sku: 'HEAVY_EXP', 
          weightInKg: 20.0 
        })
        .withExpressShipping()
        .calculate(expect.getState().currentTestName);

      expect(result.shipment.totalShipping).toBe(2500);
      expect(result.shipment).toMatchSnapshot();
    });
  });
});