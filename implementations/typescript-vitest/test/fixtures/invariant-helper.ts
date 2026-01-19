import * as fc from 'fast-check';
import { expect } from 'vitest';
import { allure } from 'allure-vitest/setup';
import { PricingEngine, CartItem, User, ShippingMethod, PricingResult } from '../../../shared/src';
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
  scenario: string; // e.g., "Critical boundary: quantity = 3 (exactly at bulk threshold)"
  tags: string[]; // e.g., ['@precondition', '@pricing', '@boundary']
}

type AssertionCallback = (items: CartItem[], user: User, result: PricingResult) => void;
type ShippingAssertionCallback = (items: CartItem[], user: User, method: ShippingMethod, result: PricingResult) => void;

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
  // Register metadata for attestation report
  registerInvariant({ ...metadata, name });
  registerAllureMetadata(allure, metadata);

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
  // Register metadata for attestation report
  registerInvariant({ ...metadata, name });
  registerAllureMetadata(allure, metadata);

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
  const name = metadata.name || expect.getState().currentTestName!;
  
  // Register Allure metadata
  registerAllureMetadata(allure, {
    ruleReference: metadata.ruleReference,
    rule: metadata.scenario,
    tags: metadata.tags
  });

  tracer.registerInvariant({
    name,
    ruleReference: metadata.ruleReference,
    rule: metadata.scenario, // Reuse 'rule' field for scenario description
    tags: metadata.tags
  });
}

/**
 * Log input/output for a precondition test
 *
 * Should be called after calculating the result to record it in the attestation report.
 *
 * @param input - Input (cart, user, and optionally method)
 * @param output - Output (pricing result)
 * @param testName - Optional name of the precondition test (defaults to current test)
 */
export function logPrecondition(input: any, output: any, testName?: string) {
  const name = testName || expect.getState().currentTestName!;
  tracer.log(name, input, output);
}

/**
 * Explain the business context for a test failure
 */
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
