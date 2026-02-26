import { test, expect } from '@playwright/test';
import { responseSchemas } from '../../../../client/src/lib/validation/schemas';
import { ShippingMethod } from '@executable-specs/shared';

const API_BASE = '/api/pricing';

test.describe('Pricing API Contract Tests', () => {

  test('POST /calculate should return valid success response matching schema', async ({ request }) => {
    const response = await request.post(`${API_BASE}/calculate`, {
      data: {
        items: [{ sku: 'TEST', name: 'Test Product', price: 1000, quantity: 1, weightInKg: 1 }],
        user: { tenureYears: 0 },
        method: ShippingMethod.STANDARD
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // STRICT Schema Validation
    const parseResult = responseSchemas.calculatePricing.safeParse(body);
    
    if (!parseResult.success) {
      console.error('Schema Validation Failed:', JSON.stringify(parseResult.error.format(), null, 2));
    }
    expect(parseResult.success).toBe(true);
  });

  test('POST /calculate should return valid error response for invalid input', async ({ request }) => {
    const response = await request.post(`${API_BASE}/calculate`, {
      data: {
        items: 'not-an-array' // Invalid type
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();

    // Verify Error Schema
    const parseResult = responseSchemas.validationError.safeParse(body);
    
    if (!parseResult.success) {
      console.error('Error Schema Validation Failed:', JSON.stringify(parseResult.error.format(), null, 2));
    }
    expect(parseResult.success).toBe(true);
    
    // Check specific fields
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.statusCode).toBe(400);
    // Note: Zod field errors format depends on middleware implementation.
    // Usually mapped to `fields: { "items": ["..."] }`
    expect(body.fields).toHaveProperty('items'); 
  });
});
