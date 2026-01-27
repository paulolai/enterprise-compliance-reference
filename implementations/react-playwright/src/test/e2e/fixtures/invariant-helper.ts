import type { Page, APIRequestContext, TestInfo } from '@playwright/test';
import { test } from '@playwright/test';
import { allure } from 'allure-playwright';
import * as fc from 'fast-check';
import type { CartItem, User } from '../../../../../shared/src';
import { ShippingMethod } from '../../../../../shared/src';
import { registerAllureMetadata } from '../../../../../shared/fixtures/allure-helpers';

// Clear localStorage before the first test to ensure clean state
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
  await context.close();
});

export interface PageBuilderState {
  cart: CartItem[];
  user: User;
  shippingMethod: ShippingMethod;
}

export interface InvariantMetadata {
  name?: string;
  ruleReference: string;
  rule: string;
  tags: string[];
}

function deriveHierarchyFromPath(filePath: string): { parentSuite: string, suite: string, feature: string } {
  const fileName = filePath.split('/').pop() || '';
  
  // Domain tag from filename (e.g. "cart" from "cart.ui.properties.test.ts")
  const parts = fileName.split('.');
  let domain = 'General';
  if (parts.length > 0 && parts[0]) {
    domain = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  return {
    parentSuite: 'GUI Verification',
    suite: domain,
    feature: domain
  };
}

/**
 * Wrapper for Playwright test that handles Attestation Metadata automatically.
 */
export function invariant(
  title: string,
  metadata: InvariantMetadata,
  testFunction: (args: { page: Page, request: APIRequestContext }, testInfo: TestInfo) => Promise<void>
) {
  test(title, async ({ page, request }, testInfo) => {
    // 0. Auto-derive Hierarchy
    const specPath = testInfo.titlePath[0] || ''; 
    const hierarchy = deriveHierarchyFromPath(specPath);
    const combinedTags = metadata.tags || [];

    const finalMetadata = { 
      ...metadata, 
      ...hierarchy,
      tags: combinedTags 
    };

    // 1. Register Metadata for Attestation Report
    registerAllureMetadata(allure, finalMetadata);
    
    // 2. Add Native Playwright Annotations
    testInfo.annotations.push({ type: 'rule', description: metadata.rule });
    testInfo.annotations.push({ type: 'reference', description: metadata.ruleReference });

    // Debug: Log browser console errors
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`[Browser Error] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.log(`[Browser Exception] ${err.message}`);
    });
    
    // 3. Execute Test
    await testFunction({ page, request }, testInfo);
  });
}

export class PageBuilder {
  private page: Page;
  private state: PageBuilderState = {
    cart: [],
    user: { tenureYears: 0 },
    shippingMethod: ShippingMethod.STANDARD,
  };

  constructor(page: Page) {
    this.page = page;
  }

  static build(page: Page): PageBuilder {
    return new PageBuilder(page);
  }

  withCart(items: CartItem[]): this {
    this.state = { ...this.state, cart: items };
    return this;
  }

  asUser(user: User): this {
    this.state = { ...this.state, user };
    return this;
  }

  withShipping(method: ShippingMethod): this {
    this.state = { ...this.state, shippingMethod: method };
    return this;
  }

  async build(): Promise<void> {
    // Go to products page
    await this.page.goto('/products');

    // Add items to cart by navigating to each product
    for (const item of this.state.cart) {
      await this.page.goto(`/products/${item.sku}`);

      // Add to cart quantity times
      for (let i = 0; i < item.quantity; i++) {
        await this.page.getByTestId('add-to-cart').click();
      }
    }

    // Go to cart
    await this.page.goto('/cart');
  }

  getState(): PageBuilderState {
    return { ...this.state };
  }

  getPage(): Page {
    return this.page;
  }
}

// Product data in sync with cartStore
const PRODUCTS = [
  { sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', price: 8900 },
  { sku: 'SMART-WATCH', name: 'Smart Watch', price: 19900 },
  { sku: 'TABLET-10', name: '10" Tablet', price: 44900 },
  { sku: 'LAPTOP-PRO', name: 'Pro Laptop', price: 129900 },
  { sku: 'DESK-LAMP', name: 'LED Desk Lamp', price: 4900 },
  { sku: 'COFFEE-MAKER', name: 'Coffee Maker', price: 8900 },
  { sku: 'THROW-BLANKET', name: 'Fleece Throw Blanket', price: 5900 },
  { sku: 'BATH-TOWEL-SET', name: 'Bath Towel Set', price: 3900 },
  { sku: 'T-SHIRT-BASIC', name: 'Basic T-Shirt', price: 2900 },
  { sku: 'JEANS-SLIM', name: 'Slim Fit Jeans', price: 8900 },
  { sku: 'HOODIE-ZIP', name: 'Zip-Up Hoodie', price: 6900 },
];

// Generator for cart items using actual product data
export const cartItemArb = fc.integer({ min: 0, max: PRODUCTS.length - 1 })
  .map((idx) => PRODUCTS[idx])
  .chain((product) => fc.record({
    sku: fc.constant(product.sku),
    name: fc.constant(product.name),
    price: fc.constant(product.price),
    quantity: fc.integer({ min: 1, max: 5 }),
    weightInKg: fc.constantFrom(0.1, 0.2, 0.5, 0.8, 1.2, 2.5),
  }));

export const userArb = fc.record<User>({
  tenureYears: fc.integer({ min: 0, max: 10 }),
});

export const shippingArb = fc.constantFrom(
  ShippingMethod.STANDARD,
  ShippingMethod.EXPEDITED,
  ShippingMethod.EXPRESS,
);

export const cartArb = fc.array(cartItemArb, { minLength: 1, maxLength: 5 });