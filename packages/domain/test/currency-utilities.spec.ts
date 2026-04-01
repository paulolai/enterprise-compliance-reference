import { describe, it, expect } from 'vitest';
import { toCents, toDollars, formatCurrency } from '../src/types';

describe('Currency Utilities', () => {
  describe('toCents', () => {
    it('converts whole dollars to cents', () => {
      expect(toCents(1)).toBe(100);
      expect(toCents(10)).toBe(1000);
      expect(toCents(100)).toBe(10000);
    });

    it('converts fractional dollars to cents', () => {
      expect(toCents(1.5)).toBe(150);
      expect(toCents(9.99)).toBe(999);
      expect(toCents(0.01)).toBe(1);
      expect(toCents(0.1)).toBe(10);
    });

    it('handles zero', () => {
      expect(toCents(0)).toBe(0);
    });

    it('handles negative values', () => {
      expect(toCents(-1)).toBe(-100);
      expect(toCents(-0.5)).toBe(-50);
      expect(toCents(-9.99)).toBe(-999);
    });

    it('handles floating point precision edge cases', () => {
      expect(toCents(0.29)).toBe(29);
      expect(toCents(1.005)).toBe(100);
    });
  });

  describe('toDollars', () => {
    it('converts whole cents to dollars', () => {
      expect(toDollars(100)).toBe(1);
      expect(toDollars(1000)).toBe(10);
      expect(toDollars(10000)).toBe(100);
    });

    it('converts fractional cents to dollars', () => {
      expect(toDollars(150)).toBe(1.5);
      expect(toDollars(999)).toBe(9.99);
      expect(toDollars(1)).toBe(0.01);
    });

    it('handles zero', () => {
      expect(toDollars(0)).toBe(0);
    });

    it('handles large values', () => {
      expect(toDollars(1000000)).toBe(10000);
      expect(toDollars(999999999)).toBe(9999999.99);
    });
  });

  describe('formatCurrency', () => {
    it('formats standard amounts with AUD symbol and two decimal places', () => {
      expect(formatCurrency(100000)).toBe('$1,000.00');
      expect(formatCurrency(100)).toBe('$1.00');
      expect(formatCurrency(1)).toBe('$0.01');
    });

    it('formats zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('formats large amounts with correct grouping', () => {
      expect(formatCurrency(100000)).toBe('$1,000.00');
      expect(formatCurrency(1000000)).toBe('$10,000.00');
      expect(formatCurrency(100000000)).toBe('$1,000,000.00');
    });

    it('formats amounts with odd cent values', () => {
      expect(formatCurrency(999)).toBe('$9.99');
      expect(formatCurrency(1050)).toBe('$10.50');
      expect(formatCurrency(1234)).toBe('$12.34');
    });
  });
});
