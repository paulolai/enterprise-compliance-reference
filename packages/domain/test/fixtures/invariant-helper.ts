import * as fc from 'fast-check';
import { expect } from 'vitest';
import { trace, SpanStatusCode, type Tracer } from '@opentelemetry/api';
import { PricingEngine, ShippingMethod } from '../../src';
import type { CartItem, User, PricingResult } from '../../src';
import { cartArb, userArb, shippingMethodArb } from '../../../shared/fixtures';
import { registerAllureMetadata } from '../../../shared/fixtures/allure-helpers';

const otelTracer: Tracer = trace.getTracer('executable-specs-domain');

export interface InvariantMetadata {
  name?: string;
  ruleReference: string;
  rule: string;
  tags: string[];
  additionalInfo?: string;
}

export interface PreconditionMetadata {
  name?: string;
  ruleReference: string;
  rule: string;
  tags: string[];
}

type AssertionCallback = (items: CartItem[], user: User, result: PricingResult) => void;
type ShippingAssertionCallback = (items: CartItem[], user: User, method: ShippingMethod, result: PricingResult) => void;

function deriveHierarchyFromTestPath(): { parentSuite: string, suite: string, feature: string } {
  const testPath = expect.getState().testPath;
  if (!testPath) return { parentSuite: 'API Verification', suite: 'Unknown', feature: 'Unknown' };

  const fileName = testPath.split('/').pop() || '';
  const parts = fileName.split('.');
  let domain = 'General';
  if (parts.length > 0 && parts[0]) {
    domain = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  return {
    parentSuite: 'API Verification',
    suite: domain,
    feature: domain
  };
}

function registerInvariant(metadata: InvariantMetadata) {
  const name = metadata.name || expect.getState().currentTestName!;
  const span = otelTracer.startSpan(`invariant.register:${name}`, {
    attributes: {
      'invariant.ruleReference': metadata.ruleReference,
      'invariant.rule': metadata.rule,
      'invariant.tags': metadata.tags,
    },
  });
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

export function verifyInvariant(
  metadata: InvariantMetadata,
  assertion: AssertionCallback
) {
  const name = metadata.name || expect.getState().currentTestName!;
  const allure = (globalThis as any).allure;

  const hierarchy = deriveHierarchyFromTestPath();
  const combinedTags = metadata.tags || [];
  const finalMetadata = { ...metadata, ...hierarchy, tags: combinedTags };

  registerInvariant({ ...finalMetadata, name });
  registerAllureMetadata(allure, finalMetadata);

  fc.assert(
    fc.property(cartArb, userArb, (items, user) => {
      const result = PricingEngine.calculate(items, user);

      const span = otelTracer.startSpan(name, {
        attributes: {
          'invariant.ruleReference': metadata.ruleReference,
          'invariant.rule': metadata.rule,
          'invariant.tags': metadata.tags,
          'invariant.user.tenureYears': user.tenureYears,
          'invariant.item.quantities': items.map(i => i.quantity),
          'invariant.item.count': items.length,
          'invariant.originalTotal': result.originalTotal,
          'invariant.finalTotal': result.finalTotal,
          'invariant.totalDiscount': result.totalDiscount,
          'invariant.isCapped': result.isCapped,
          'invariant.shipment.isFreeShipping': result.shipment.isFreeShipping,
          'invariant.shipment.totalShipping': result.shipment.totalShipping,
          'invariant.shippingMethod': result.shipment.method,
        },
      });

      try {
        assertion(items, user, result);
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        span.recordException(error instanceof Error ? error : new Error(String(error)));

        const context = explainBusinessContext(items, user, result);
        throw new Error(
          `Invariant Violation: ${name}\n` +
          `Business Rule: ${metadata.ruleReference} - ${metadata.rule}\n` +
          `Tags: ${metadata.tags.join(', ')}\n` +
          `Business Context:\n${context}\n\n` +
          `Counterexample:\n${JSON.stringify({ items, user, result }, null, 2)}\n\n` +
          `Original Error: ${error}`
        );
      } finally {
        span.end();
      }

      return true;
    }),
    { verbose: true }
  );
}

export function verifyShippingInvariant(
  metadata: InvariantMetadata,
  assertion: ShippingAssertionCallback
) {
  const name = metadata.name || expect.getState().currentTestName!;
  const allure = (globalThis as any).allure;

  const hierarchy = deriveHierarchyFromTestPath();
  const combinedTags = metadata.tags || [];
  const finalMetadata = { ...metadata, ...hierarchy, tags: combinedTags };

  registerInvariant({ ...finalMetadata, name });
  registerAllureMetadata(allure, finalMetadata);

  fc.assert(
    fc.property(cartArb, userArb, shippingMethodArb, (items, user, method) => {
      const result = PricingEngine.calculate(items, user, method);

      const span = otelTracer.startSpan(name, {
        attributes: {
          'invariant.ruleReference': metadata.ruleReference,
          'invariant.rule': metadata.rule,
          'invariant.tags': metadata.tags,
          'invariant.user.tenureYears': user.tenureYears,
          'invariant.item.quantities': items.map(i => i.quantity),
          'invariant.item.count': items.length,
          'invariant.originalTotal': result.originalTotal,
          'invariant.finalTotal': result.finalTotal,
          'invariant.totalDiscount': result.totalDiscount,
          'invariant.isCapped': result.isCapped,
          'invariant.shipment.isFreeShipping': result.shipment.isFreeShipping,
          'invariant.shipment.totalShipping': result.shipment.totalShipping,
          'invariant.shippingMethod': method,
        },
      });

      try {
        assertion(items, user, method, result);
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        span.recordException(error instanceof Error ? error : new Error(String(error)));

        const context = explainBusinessContext(items, user, result, method);
        throw new Error(
          `Invariant Violation: ${name}\n` +
          `Business Rule: ${metadata.ruleReference} - ${metadata.rule}\n` +
          `Tags: ${metadata.tags.join(', ')}\n` +
          `Business Context:\n${context}\n\n` +
          `Counterexample:\n${JSON.stringify({ items, user, method, result }, null, 2)}\n\n` +
          `Original Error: ${error}`
        );
      } finally {
        span.end();
      }

      return true;
    }),
    { verbose: true }
  );
}

export function registerPrecondition(metadata: PreconditionMetadata) {
  const name = metadata.name || expect.getState().currentTestName;
  if (!name) {
    throw new Error('registerPrecondition must be called within a test or provide explicit name in metadata.name');
  }
  const allure = (globalThis as any).allure;

  registerAllureMetadata(allure, {
    ruleReference: metadata.ruleReference,
    rule: metadata.rule,
    tags: metadata.tags
  });

  const span = otelTracer.startSpan(`precondition:${name}`, {
    attributes: {
      'invariant.ruleReference': metadata.ruleReference,
      'invariant.rule': metadata.rule,
      'invariant.tags': metadata.tags,
    },
  });
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

export async function verifyExample(
  metadata: PreconditionMetadata,
  testFn: () => void | Promise<void> | { input: any, output: any } | Promise<{ input: any, output: any }>
) {
  const name = metadata.name || expect.getState().currentTestName;
  if (!name) {
    throw new Error('verifyExample must be called within a test or provide explicit name in metadata.name');
  }

  const hierarchy = deriveHierarchyFromTestPath();
  const combinedTags = metadata.tags || [];
  const finalMetadata = {
    ruleReference: metadata.ruleReference,
    rule: metadata.rule,
    tags: combinedTags,
    ...hierarchy
  };

  const allure = (globalThis as any).allure;
  registerAllureMetadata(allure, finalMetadata);

  const span = otelTracer.startSpan(name, {
    attributes: {
      'invariant.ruleReference': metadata.ruleReference,
      'invariant.rule': metadata.rule,
      'invariant.tags': metadata.tags,
    },
  });

  try {
    const result = await testFn();

    if (isTraceableResult(result)) {
      span.setAttributes({
        'invariant.input': JSON.stringify(result.input),
        'invariant.output': JSON.stringify(result.output),
      });
    }

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error instanceof Error ? error : new Error(String(error)));

    throw new Error(
      `Test Failed: ${name}\n` +
      `Business Rule: ${metadata.ruleReference} - ${metadata.rule}\n` +
      `Tags: ${metadata.tags.join(', ')}\n` +
      `Original Error: ${error}`
    );
  } finally {
    span.end();
  }
}

function isTraceableResult(result: unknown): result is { input: any, output: any } {
  return result !== null
    && typeof result === 'object'
    && !Array.isArray(result)
    && 'input' in result
    && 'output' in result
    && Object.keys(result).length === 2;
}

export function logPrecondition(input: any, output: any) {
  const name = expect.getState().currentTestName!;
  const span = otelTracer.startSpan(`precondition.log:${name}`, {
    attributes: {
      'invariant.ruleReference': 'precondition',
      'invariant.input': JSON.stringify(input),
      'invariant.output': JSON.stringify(output),
    },
  });
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
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
