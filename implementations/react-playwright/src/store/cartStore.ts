import { create } from 'zustand';
import { ShippingMethod } from '../../../shared/src';
import type { CartItem, PricingResult, User } from '../../../shared/src';

export interface CartItemWithMetadata extends CartItem {
  addedAt: number;
}

interface CartState {
  items: CartItemWithMetadata[];
  user: User | null;
  shippingMethod: ShippingMethod;
  pricingResult: PricingResult | null;

  // Actions
  addItem: (item: Omit<CartItemWithMetadata, 'addedAt'>) => void;
  removeItem: (sku: string) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  setUser: (user: User | null) => void;
  setShippingMethod: (method: ShippingMethod) => void;
  setPricingResult: (result: PricingResult | null) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  user: null,
  shippingMethod: ShippingMethod.STANDARD,
  pricingResult: null,

  addItem: (item) => {
    set((state) => {
      const existingItem = state.items.find((i) => i.sku === item.sku);
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.sku === item.sku
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        };
      }
      return {
        items: [...state.items, { ...item, addedAt: Date.now() }],
      };
    });
  },

  removeItem: (sku) => {
    set((state) => ({
      items: state.items.filter((item) => item.sku !== sku),
    }));
  },

  updateQuantity: (sku, quantity) => {
    if (quantity <= 0) {
      get().removeItem(sku);
      return;
    }
    set((state) => ({
      items: state.items.map((item) =>
        item.sku === sku ? { ...item, quantity } : item
      ),
    }));
  },

  setUser: (user) => set({ user }),

  setShippingMethod: (method) => set({ shippingMethod: method }),

  setPricingResult: (result) => set({ pricingResult: result }),

  clear: () =>
    set({
      items: [],
      pricingResult: null,
      shippingMethod: ShippingMethod.STANDARD,
    }),
}));

// Mock product catalog (10-15 items per plan)
export const productCatalog: Array<{
  sku: string;
  name: string;
  price: number; // cents
  weightInKg: number;
  category: 'Electronics' | 'Home' | 'Clothing';
  description: string;
}> = [
  // Electronics (4 items)
  {
    sku: 'WIRELESS-EARBUDS',
    name: 'Wireless Earbuds',
    price: 8900,
    weightInKg: 0.1,
    category: 'Electronics',
    description: 'High-quality wireless earbuds with active noise cancellation.',
  },
  {
    sku: 'SMART-WATCH',
    name: 'Smart Watch',
    price: 24900,
    weightInKg: 0.2,
    category: 'Electronics',
    description: 'Fitness tracking smartwatch with heart rate monitor.',
  },
  {
    sku: 'TABLET-10',
    name: '10" Tablet',
    price: 44900,
    weightInKg: 0.5,
    category: 'Electronics',
    description: '10-inch tablet with HD display and 64GB storage.',
  },
  {
    sku: 'LAPTOP-PRO',
    name: 'Pro Laptop',
    price: 89900,
    weightInKg: 2.5,
    category: 'Electronics',
    description: '14-inch Pro laptop with 16GB RAM and 512GB SSD.',
  },

  // Home (4 items)
  {
    sku: 'DESK-LAMP',
    name: 'LED Desk Lamp',
    price: 3500,
    weightInKg: 0.8,
    category: 'Home',
    description: 'Adjustable LED desk lamp with USB charging port.',
  },
  {
    sku: 'COFFEE-MAKER',
    name: 'Coffee Maker',
    price: 8900,
    weightInKg: 2.5,
    category: 'Home',
    description: 'Programmable 12-cup coffee maker with thermal carafe.',
  },
  {
    sku: 'THROW-BLANKET',
    name: 'Fleece Throw Blanket',
    price: 4500,
    weightInKg: 1.2,
    category: 'Home',
    description: 'Soft fleece throw blanket, 50" x 60".',
  },
  {
    sku: 'BATH-TOWEL-SET',
    name: 'Bath Towel Set',
    price: 12000,
    weightInKg: 2.8,
    category: 'Home',
    description: '6-piece bath towel set, premium cotton.',
  },

  // Clothing (3 items)
  {
    sku: 'T-SHIRT-BASIC',
    name: 'Basic T-Shirt',
    price: 2500,
    weightInKg: 0.2,
    category: 'Clothing',
    description: '100% cotton basic t-shirt in multiple colors.',
  },
  {
    sku: 'JEANS-SLIM',
    name: 'Slim Fit Jeans',
    price: 6500,
    weightInKg: 0.5,
    category: 'Clothing',
    description: 'Classic slim fit jeans with stretch comfort.',
  },
  {
    sku: 'HOODIE-ZIP',
    name: 'Zip-Up Hoodie',
    price: 7000,
    weightInKg: 0.6,
    category: 'Clothing',
    description: 'Comfortable zip-up hoodie with kangaroo pocket.',
  },
];
