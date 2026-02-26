import { test, expect } from '@playwright/test';

/**
 * Integration Tests for the Products API.
 */
test.describe('Products API Integration Tests', () => {

  test('GET /api/products returns all products', async ({ request }) => {
    const response = await request.get('/api/products');
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('products');
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products.length).toBeGreaterThan(0);
    
    // Check product structure
    const firstProduct = body.products[0];
    expect(firstProduct).toHaveProperty('sku');
    expect(firstProduct).toHaveProperty('name');
    expect(firstProduct).toHaveProperty('priceInCents');
  });

  test('GET /api/products/:sku returns specific product', async ({ request }) => {
    // 1. Get all SKUs first
    const listResponse = await request.get('/api/products');
    const { products } = await listResponse.json();
    const firstSku = products[0].sku;
    
    // 2. Fetch specific product
    const response = await request.get(`/api/products/${firstSku}`);
    
    expect(response.status()).toBe(200);
    
    const product = await response.json();
    expect(product.sku).toBe(firstSku);
    expect(product).toHaveProperty('name');
  });

  test('GET /api/products/:sku returns 404 for unknown SKU', async ({ request }) => {
    const response = await request.get('/api/products/NON-EXISTENT-SKU');
    expect(response.status()).toBe(404);
  });
});
