import * as fc from 'fast-check';
import { expect } from 'vitest';
import { PricingEngine, CartItem, User, ShippingMethod, PricingResult } from '../../src';
import { cartArb, userArb, shippingMethodArb } from '../../../shared/fixtures';
import { registerAllureMetadata } from '../../../shared/fixtures/allure-helpers';
import { tracer } from '../modules/tracer';

export interface InvariantMetadata {
  name?: string;
  ruleReference: string; // e.g., "pricing-strategy.md §2"
  rule: string;
  tags: string[]; // Serenity-style tags: ['@pricing', '@vip', '@critical']
  additionalInfo?: string;
}

export interface PreconditionMetadata {
  name?: string;
  ruleReference: string; // e.g., "pricing-strategy.md §2 - Bulk Discounts"
  rule: string; // e.g., "Critical boundary: quantity = 3 (exactly at bulk threshold)"
  tags: string[]; // e.g., ['@precondition', '@pricing', '@boundary']
}

type AssertionCallback = (items: CartItem[], user: User, result: PricingResult) => void;
type ShippingAssertionCallback = (items: CartItem[], user: User, method: ShippingMethod, result: PricingResult) => void;

function deriveHierarchyFromTestPath(): { parentSuite: string, suite: string, feature: string } {
  const testPath = expect.getState().testPath;
  if (!testPath) return { parentSuite: 'API Verification', suite: 'Unknown', feature: 'Unknown' };
  
  const fileName = testPath.split('/').pop() || '';
  
  // Domain tag (e.g., 'pricing' from 'pricing.properties.test.ts')
  const parts = fileName.split('.');
  let domain = 'General';
  if (parts.length > 0 && parts[0]) {
    domain = parts[0].charAt(0).toUpperCase() + parts[0].slice(1); // Capitalize
  }

  return {
    parentSuite: 'API Verification',
    suite: domain,
    feature: domain
  };
}

/**
 * Register invariant metadata with the tracer for attestation reports
 */
function registerInvariant(metadata: InvariantMetadata) {
  const name = metadata.name || expect.getState().currentTestName!;
  tracer.registerInvariant({ ...metadata, name });
}

/**
 * Helper to verify a pricing invariant.
 * Automatically handles:
 * - Property generation (Cart + User)
 * - PricingEngine execution
 * - Tracer logging with metadata
 * - Fast-check assertion
 *
 * @param metadata - Business rule documentation for attestation reports
 * @param assertion - The invariant test logic
 */
export function verifyInvariant(
  metadata: InvariantMetadata,
  assertion: AssertionCallback
) {
  const name = metadata.name || expect.getState().currentTestName!;
  const allure = (globalThis as any).allure;
  
  // Auto-derive Hierarchy
  const hierarchy = deriveHierarchyFromTestPath();
  const combinedTags = metadata.tags || [];

  const finalMetadata = { 
    ...metadata, 
    ...hierarchy,
    tags: combinedTags 
  };

  // Register metadata for attestation report
  registerInvariant({ ...finalMetadata, name });
  registerAllureMetadata(allure, finalMetadata);

  fc.assert(
    fc.property(cartArb, userArb, (items, user) => {
      const result = PricingEngine.calculate(items, user);
      // Log every execution with invariant metadata
      tracer.log(name, { items, user }, result);

      try {
        assertion(items, user, result);
      } catch (error) {
        // Enhance error with business context
        const context = explainBusinessContext(items, user, result);
        throw new Error(
          `Invariant Violation: ${name}\n` +
          `Business Rule: ${metadata.ruleReference} - ${metadata.rule}\n` +
          `Tags: ${metadata.tags.join(', ')}\n` +
          `Business Context:\n${context}\n\n` +
          `Counterexample:\n${JSON.stringify({ items, user, result }, null, 2)}\n\n` +
          `Original Error: ${error}`
        );
      }

      return true; // Property passed if assertion didn't throw
    }),
    { verbose: true }
  );
}

/**
 * Helper to verify a shipping invariant.
 * Automatically handles:
 * - Property generation (Cart + User + ShippingMethod)
 * - PricingEngine execution
 * - Tracer logging with metadata
 * - Fast-check assertion
 *
 * @param metadata - Business rule documentation for attestation reports
 * @param assertion - The invariant test logic
 */
export function verifyShippingInvariant(
  metadata: InvariantMetadata,
  assertion: ShippingAssertionCallback
) {
  const name = metadata.name || expect.getState().currentTestName!;
  const allure = (globalThis as any).allure;
  
  // Auto-derive Hierarchy
  const hierarchy = deriveHierarchyFromTestPath();
  const combinedTags = metadata.tags || [];

  const finalMetadata = { 
    ...metadata, 
    ...hierarchy,
    tags: combinedTags 
  };

  // Register metadata for attestation report
  registerInvariant({ ...finalMetadata, name });
  registerAllureMetadata(allure, finalMetadata);

  fc.assert(
    fc.property(cartArb, userArb, shippingMethodArb, (items, user, method) => {
      const result = PricingEngine.calculate(items, user, method);
      tracer.log(name, { items, user, method }, result);

      try {
        assertion(items, user, method, result);
      } catch (error) {
        const context = explainBusinessContext(items, user, result, method);
        throw new Error(
          `Invariant Violation: ${name}\n` +
          `Business Rule: ${metadata.ruleReference} - ${metadata.rule}\n` +
          `Tags: ${metadata.tags.join(', ')}\n` +
          `Business Context:\n${context}\n\n` +
          `Counterexample:\n${JSON.stringify({ items, user, method, result }, null, 2)}\n\n` +
          `Original Error: ${error}`
        );
      }

      return true;
    }),
    { verbose: true }
  );
}

/**
 * Register precondition metadata for example tests
 *
 * This helper registers structured metadata for example-based tests (like preconditions),
 * making test intent visible in attestation reports. Unlike verifyInvariant() which is
 * used for property-based tests, this is used for specific edge case tests.
 *
 * @param metadata - Business rule documentation for attestation reports
 */
export function registerPrecondition(metadata: PreconditionMetadata) {
  const name = metadata.name || expect.getState().currentTestName;
  if (!name) {
    throw new Error('registerPrecondition must be called within a test or provide explicit name in metadata.name');
  }
  const allure = (globalThis as any).allure;

  // Register Allure metadata
  registerAllureMetadata(allure, {
    ruleReference: metadata.ruleReference,
    rule: metadata.rule,
    tags: metadata.tags
  });

  tracer.registerInvariant({
    name,
    ruleReference: metadata.ruleReference,
    rule: metadata.rule,
    tags: metadata.tags
  });
}

/**
 * Helper to verify a specific example (non-PBT).
 * Lightweight wrapper that handles metadata registration, error context, and optional auto-logging.
 *
 * @param metadata - Business rule documentation
 * @param testFn - The test logic. If it returns an object with {input, output}, it will be logged automatically.
 */
export async function verifyExample(
  metadata: PreconditionMetadata,
  testFn: () => void | Promise<void> | { input: any, output: any } | Promise<{ input: any, output: any }>
) {
  const name = metadata.name || expect.getState().currentTestName;
  if (!name) {
    throw new Error('verifyExample must be called within a test or provide explicit name in metadata.name');
  }

  // Auto-derive Hierarchy
  const hierarchy = deriveHierarchyFromTestPath();
  const combinedTags = metadata.tags || [];

  const finalMetadata = {
    ruleReference: metadata.ruleReference,
    rule: metadata.rule,
    tags: combinedTags,
    ...hierarchy
  };

  // Register Metadata
  const allure = (globalThis as any).allure;
  registerAllureMetadata(allure, finalMetadata);
  tracer.registerInvariant({ ...finalMetadata, name });

  // Execute Test with error context enhancement
  try {
    const result = await testFn();

    // Auto-Log if the test returned structured data
    if (isTraceableResult(result)) {
      tracer.log(name, result.input, result.output);
    }
  } catch (error) {
    // Enhance error with business context
    throw new Error(
      `Test Failed: ${name}\n` +
      `Business Rule: ${metadata.ruleReference} - ${metadata.rule}\n` +
      `Tags: ${metadata.tags.join(', ')}\n` +
      `Original Error: ${error}`
    );
  }
}

/**
 * Type guard to check if a value has the exact {input, output} shape
 * This prevents false positives on objects with extra properties
 */
function isTraceableResult(result: unknown): result is { input: any, output: any } {
  return result !== null
    && typeof result === 'object'
    && !Array.isArray(result)
    && 'input' in result
    && 'output' in result
    && Object.keys(result).length === 2;
}

/**
 * Helper to log precondition test data for attestation reports
 *
 * This is used by example-based precondition tests to log input/output pairs
 * for attestation reports. Unlike verifyInvariant() which handles PBT logging,
 * this is for specific edge cases that need explicit documentation.
 *
 * @param input - Test input data (items, user, method, etc.)
 * @param output - Test result (PricingResult)
 */
export function logPrecondition(input: any, output: any) {
  const name = expect.getState().currentTestName!;
  tracer.log(name, input, output);
}

function explainBusinessContext(
  items: CartItem[],
  user: User,
  result: PricingResult,
  method?: ShippingMethod
): string {
  const lines = [
    `  Cart Total: $${(result.originalTotal / 100).toFixed(2)} (total ${(result.finalTotal / 100).toFixed(2)} after discounts)`,
    `  User Tenure: ${user.tenureYears} years ${user.tenureYears > 2 ? '(VIP - eligible for 5% discount)' : '(Non-VIP)'}`,
    `  Line Items: ${items.length} (bulk discount on ${result.lineItems.filter(li => li.quantity >= 3).length} items)`,
    `  Total Discount: $${(result.totalDiscount / 100).toFixed(2)} (${Math.round(result.totalDiscount / result.originalTotal * 100)}% of original)`,
    `  Safety Valve: ${result.isCapped ? 'CAPPED at 30%' : 'Not capped'}`,
  ];

  if (method) {
    lines.push(`  Shipping: ${method} - Total: $${(result.shipment.totalShipping / 100).toFixed(2)}`);
    lines.push(`    Free Shipping: ${result.shipment.isFreeShipping ? 'YES' : 'NO'}`);
    if (method === 'EXPEDITED') {
      lines.push(`    Expedited Surcharge: $${(result.shipment.expeditedSurcharge / 100).toFixed(2)}`);
    }
  }

  return lines.join('\n');
}
