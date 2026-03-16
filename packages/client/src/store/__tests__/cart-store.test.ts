import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cart-store';
import { ShippingMethod } from '../../../shared/src';

// Mock localStorage for Node environment
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: function(key: string) {
      return store[key] || null;
    },
    setItem: function(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem: function(key: string) {
      delete store[key];
    },
    clear: function() {
      store = {};
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('Cart Store', () => {
  beforeEach(() => {
    useCartStore.getState().clear();
    localStorage.clear();
  });

  it('should start with empty state', () => {
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.user).toBeNull();
    expect(state.shippingMethod).toBe(ShippingMethod.STANDARD);
  });

  it('should add a new item', () => {
    useCartStore.getState().addItem({
      sku: 'TEST-SKU',
      name: 'Test Item',
      price: 1000,
      quantity: 1,
      weightInKg: 1
    });

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({
      sku: 'TEST-SKU',
      quantity: 1
    });
    // addedAt should be a number (timestamp)
    expect(typeof state.items[0].addedAt).toBe('number');
  });

  it('should merge existing items', () => {
    const item = {
      sku: 'TEST-SKU',
      name: 'Test Item',
      price: 1000,
      quantity: 1,
      weightInKg: 1
    };

    useCartStore.getState().addItem(item);
    // Add same item again
    useCartStore.getState().addItem(item);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
  });

  it('should remove an item', () => {
    useCartStore.getState().addItem({
      sku: 'TEST-SKU',
      name: 'Test Item',
      price: 1000,
      quantity: 1,
      weightInKg: 1
    });

    useCartStore.getState().removeItem('TEST-SKU');
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('should update quantity', () => {
    useCartStore.getState().addItem({
      sku: 'TEST-SKU',
      name: 'Test Item',
      price: 1000,
      quantity: 1,
      weightInKg: 1
    });

    useCartStore.getState().updateQuantity('TEST-SKU', 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('should remove item if quantity updated to zero', () => {
    useCartStore.getState().addItem({
      sku: 'TEST-SKU',
      name: 'Test Item',
      price: 1000,
      quantity: 1,
      weightInKg: 1
    });

    useCartStore.getState().updateQuantity('TEST-SKU', 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('should remove item if quantity updated to negative', () => {
    useCartStore.getState().addItem({
      sku: 'TEST-SKU',
      name: 'Test Item',
      price: 1000,
      quantity: 1,
      weightInKg: 1
    });

    useCartStore.getState().updateQuantity('TEST-SKU', -1);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('should clear all state', () => {
    useCartStore.getState().addItem({
      sku: 'TEST-SKU',
      name: 'Test Item',
      price: 1000,
      quantity: 1,
      weightInKg: 1
    });
    useCartStore.getState().setUser({ tenureYears: 5 });
    
    useCartStore.getState().clear();

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(0);
    expect(state.user).toBeNull();
    expect(state.shippingMethod).toBe(ShippingMethod.STANDARD);
  });

  it('should set user', () => {
    const user = { tenureYears: 5, name: 'Test User' };
    useCartStore.getState().setUser(user);
    expect(useCartStore.getState().user).toEqual(user);
  });

  it('should set shipping method', () => {
    useCartStore.getState().setShippingMethod(ShippingMethod.EXPRESS);
    expect(useCartStore.getState().shippingMethod).toBe(ShippingMethod.EXPRESS);
  });
});
