import { describe, it, expect, beforeAll } from 'vitest';
import { trace } from '@opentelemetry/api';
import type { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import type { InvariantSpanProcessor } from '@executable-specs/shared/modules/invariant-span-processor';
import { getInvariantProcessor } from '@executable-specs/shared/modules/otel-setup';
import {
  verifyInvariant,
  verifyShippingInvariant,
  registerPrecondition,
  verifyExample,
} from './fixtures/invariant-helper';
import type { CartItem, User, PricingResult } from '../src';
import type { ShippingMethod } from '../src';

function getSpanExporter(): InMemorySpanExporter {
  return (globalThis as any).__otel.getSpanExporter();
}

function getProcessor(): InvariantSpanProcessor {
  const processor = getInvariantProcessor();
  if (!processor) throw new Error('InvariantSpanProcessor not initialized');
  return processor;
}

describe('Invariant Helper: Span Creation', () => {
  describe('verifyInvariant', () => {
    it('creates spans with correct invariant attributes', () => {
      const processor = getProcessor();
      const exporter = getSpanExporter();
      processor.clear();
      exporter.reset();

      verifyInvariant({
        ruleReference: 'pricing-strategy.md §1 - Base Rules',
        rule: 'Final Total must never exceed Original Total',
        tags: ['@pricing', '@base-rules'],
      }, (_items: CartItem[], _user: User, result: PricingResult) => {
        expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
      });

      const summaries = processor.getSummaries();
      expect(summaries.length).toBeGreaterThan(0);

      const summary = summaries.find(s => s.ruleReference === 'pricing-strategy.md §1 - Base Rules');
      expect(summary).toBeDefined();
      expect(summary!.rule).toBe('Final Total must never exceed Original Total');
      expect(summary!.tags).toContain('@pricing');
      expect(summary!.totalRuns).toBeGreaterThan(0);
      expect(summary!.passed).toBe(true);

      const metadata = processor.getMetadata();
      const invariantNames = Array.from(metadata.keys());
      expect(invariantNames.length).toBeGreaterThan(0);
    });

    it('creates register span before main invariant span', () => {
      const processor = getProcessor();
      const exporter = getSpanExporter();
      processor.clear();
      exporter.reset();

      verifyInvariant({
        ruleReference: 'pricing-strategy.md §2 - Bulk Discounts',
        rule: 'Line items with qty >= 3 get 15% discount',
        tags: ['@pricing', '@bulk'],
      }, (_items: CartItem[], _user: User, result: PricingResult) => {
        expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
      });

      const spans = exporter.getFinishedSpans();
      const registerSpans = spans.filter(s => s.name.startsWith('invariant.register:'));
      expect(registerSpans.length).toBeGreaterThan(0);

      const regSpan = registerSpans[0];
      expect(regSpan.attributes['invariant.ruleReference']).toBe('pricing-strategy.md §2 - Bulk Discounts');
      expect(regSpan.attributes['invariant.rule']).toBe('Line items with qty >= 3 get 15% discount');
      expect(regSpan.attributes['invariant.tags']).toEqual(['@pricing', '@bulk']);
    });

    it('creates main span with data attributes (tenureYears, quantities, totals)', () => {
      const processor = getProcessor();
      const exporter = getSpanExporter();
      processor.clear();
      exporter.reset();

      verifyInvariant({
        ruleReference: 'pricing-strategy.md §1 - Base Rules',
        rule: 'All monetary values are integers',
        tags: ['@pricing', '@boundary'],
      }, (_items: CartItem[], _user: User, result: PricingResult) => {
        expect(Number.isInteger(result.originalTotal)).toBe(true);
      });

      const spans = exporter.getFinishedSpans();
      const mainSpans = spans.filter(
        s => !s.name.startsWith('invariant.register:') && s.attributes['invariant.ruleReference'] !== undefined
      );
      expect(mainSpans.length).toBeGreaterThan(0);

      const mainSpan = mainSpans[0];
      expect(mainSpan.attributes['invariant.user.tenureYears']).toBeDefined();
      expect(mainSpan.attributes['invariant.item.quantities']).toBeDefined();
      expect(mainSpan.attributes['invariant.item.count']).toBeDefined();
      expect(mainSpan.attributes['invariant.originalTotal']).toBeDefined();
      expect(mainSpan.attributes['invariant.finalTotal']).toBeDefined();
      expect(mainSpan.attributes['invariant.totalDiscount']).toBeDefined();
      expect(mainSpan.attributes['invariant.isCapped']).toBeDefined();
      expect(mainSpan.attributes['invariant.shipment.isFreeShipping']).toBeDefined();
      expect(mainSpan.attributes['invariant.shipment.totalShipping']).toBeDefined();
      expect(mainSpan.attributes['invariant.shippingMethod']).toBeDefined();
    });
  });

  describe('verifyShippingInvariant', () => {
    it('creates spans with shipping method attribute', () => {
      const processor = getProcessor();
      const exporter = getSpanExporter();
      processor.clear();
      exporter.reset();

      verifyShippingInvariant({
        ruleReference: 'pricing-strategy.md §5 - Shipping',
        rule: 'Shipping cost is calculated correctly',
        tags: ['@shipping', '@pricing'],
      }, (_items: CartItem[], _user: User, _method: ShippingMethod, result: PricingResult) => {
        expect(result.shipment.totalShipping).toBeGreaterThanOrEqual(0);
      });

      const summaries = processor.getSummaries();
      expect(summaries.length).toBeGreaterThan(0);

      const summary = summaries.find(s => s.ruleReference === 'pricing-strategy.md §5 - Shipping');
      expect(summary).toBeDefined();
      expect(summary!.totalRuns).toBeGreaterThan(0);
      expect(summary!.passed).toBe(true);
    });

    it('creates register span for shipping invariant', () => {
      const processor = getProcessor();
      const exporter = getSpanExporter();
      processor.clear();
      exporter.reset();

      verifyShippingInvariant({
        ruleReference: 'pricing-strategy.md §5 - Shipping',
        rule: 'Free shipping for orders over $100',
        tags: ['@shipping', '@free-shipping'],
      }, (_items: CartItem[], _user: User, _method: ShippingMethod, result: PricingResult) => {
        expect(result.shipment.totalShipping).toBeGreaterThanOrEqual(0);
      });

      const spans = exporter.getFinishedSpans();
      const registerSpans = spans.filter(s => s.name.startsWith('invariant.register:'));
      expect(registerSpans.length).toBeGreaterThan(0);

      const regSpan = registerSpans[0];
      expect(regSpan.attributes['invariant.ruleReference']).toBe('pricing-strategy.md §5 - Shipping');
      expect(regSpan.attributes['invariant.tags']).toEqual(['@shipping', '@free-shipping']);
    });
  });

  describe('registerPrecondition', () => {
    it('creates precondition span with invariant attributes', () => {
      const processor = getProcessor();
      const exporter = getSpanExporter();
      processor.clear();
      exporter.reset();

      registerPrecondition({
        name: 'test-precondition',
        ruleReference: 'pricing-strategy.md §1 - Precondition',
        rule: 'User must have valid tenure',
        tags: ['@precondition', '@validation'],
      });

      const spans = exporter.getFinishedSpans();
      const preconditionSpans = spans.filter(s => s.name.startsWith('precondition:'));
      expect(preconditionSpans.length).toBeGreaterThan(0);

      const preSpan = preconditionSpans[0];
      expect(preSpan.name).toBe('precondition:test-precondition');
      expect(preSpan.attributes['invariant.ruleReference']).toBe('pricing-strategy.md §1 - Precondition');
      expect(preSpan.attributes['invariant.rule']).toBe('User must have valid tenure');
      expect(preSpan.attributes['invariant.tags']).toEqual(['@precondition', '@validation']);
    });
  });

  describe('verifyExample', () => {
    it('creates span for example test', async () => {
      const processor = getProcessor();
      const exporter = getSpanExporter();
      processor.clear();
      exporter.reset();

      await verifyExample({
        name: 'example-test',
        ruleReference: 'pricing-strategy.md §1 - Example',
        rule: 'Example rule verification',
        tags: ['@example'],
      }, () => {
        expect(1 + 1).toBe(2);
      });

      const summaries = processor.getSummaries();
      const summary = summaries.find(s => s.name === 'example-test');
      expect(summary).toBeDefined();
      expect(summary!.passed).toBe(true);

      const spans = exporter.getFinishedSpans();
      const exampleSpans = spans.filter(s => s.name === 'example-test');
      expect(exampleSpans.length).toBeGreaterThan(0);
    });

    it('sets input/output attributes when testFn returns traceable result', async () => {
      const processor = getProcessor();
      const exporter = getSpanExporter();
      processor.clear();
      exporter.reset();

      await verifyExample({
        name: 'traceable-example',
        ruleReference: 'pricing-strategy.md §1 - Traceable',
        rule: 'Traceable example verification',
        tags: ['@example', '@traceable'],
      }, () => {
        return {
          input: { tenureYears: 3, items: [{ quantity: 2 }] },
          output: { finalTotal: 8500, originalTotal: 10000 },
        };
      });

      const spans = exporter.getFinishedSpans();
      const exampleSpans = spans.filter(s => s.name === 'traceable-example');
      expect(exampleSpans.length).toBeGreaterThan(0);

      const span = exampleSpans[0];
      expect(span.attributes['invariant.input']).toBeDefined();
      expect(span.attributes['invariant.output']).toBeDefined();

      const inputData = JSON.parse(span.attributes['invariant.input'] as string);
      expect(inputData.tenureYears).toBe(3);

      const outputData = JSON.parse(span.attributes['invariant.output'] as string);
      expect(outputData.finalTotal).toBe(8500);
    });

    it('does not set input/output attributes when testFn returns void', async () => {
      const processor = getProcessor();
      const exporter = getSpanExporter();
      processor.clear();
      exporter.reset();

      await verifyExample({
        name: 'void-example',
        ruleReference: 'pricing-strategy.md §1 - Void',
        rule: 'Void example verification',
        tags: ['@example'],
      }, () => {
        expect(true).toBe(true);
      });

      const spans = exporter.getFinishedSpans();
      const exampleSpans = spans.filter(s => s.name === 'void-example');
      expect(exampleSpans.length).toBeGreaterThan(0);

      const span = exampleSpans[0];
      expect(span.attributes['invariant.input']).toBeUndefined();
      expect(span.attributes['invariant.output']).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('marks span with ERROR status when assertion throws', () => {
      const processor = getProcessor();
      const exporter = getSpanExporter();
      processor.clear();
      exporter.reset();

      expect(() => {
        verifyInvariant({
          ruleReference: 'pricing-strategy.md §1 - Error Test',
          rule: 'This invariant should fail',
          tags: ['@error-test'],
        }, (_items: CartItem[], _user: User, result: PricingResult) => {
          expect(result.finalTotal).toBeGreaterThan(result.originalTotal);
        });
      }).toThrow(/Property failed/);

      const spans = exporter.getFinishedSpans();
      const errorSpans = spans.filter(
        s => s.status.code === 2 && s.attributes['invariant.ruleReference'] === 'pricing-strategy.md §1 - Error Test'
      );
      expect(errorSpans.length).toBeGreaterThan(0);

      const errorSpan = errorSpans[0];
      expect(errorSpan.status.message).toBeDefined();
    });

    it('records exception on span when assertion throws', () => {
      const processor = getProcessor();
      const exporter = getSpanExporter();
      processor.clear();
      exporter.reset();

      expect(() => {
        verifyInvariant({
          ruleReference: 'pricing-strategy.md §1 - Exception Test',
          rule: 'This invariant records exception',
          tags: ['@exception-test'],
        }, (_items: CartItem[], _user: User, result: PricingResult) => {
          expect(result.finalTotal).toBeGreaterThan(result.originalTotal);
        });
      }).toThrow(/Property failed/);

      const spans = exporter.getFinishedSpans();
      const exceptionSpans = spans.filter(
        s => s.status.code === 2 && s.attributes['invariant.ruleReference'] === 'pricing-strategy.md §1 - Exception Test'
      );
      expect(exceptionSpans.length).toBeGreaterThan(0);

      const events = exceptionSpans[0].events;
      const exceptionEvents = events.filter(e => e.name === 'exception');
      expect(exceptionEvents.length).toBeGreaterThan(0);
    });

    it('marks summary as failed when span has ERROR status', () => {
      const processor = getProcessor();
      const exporter = getSpanExporter();
      processor.clear();
      exporter.reset();

      expect(() => {
        verifyInvariant({
          ruleReference: 'pricing-strategy.md §1 - Failure Test',
          rule: 'This invariant should be marked as failed',
          tags: ['@failure-test'],
        }, (_items: CartItem[], _user: User, result: PricingResult) => {
          expect(result.finalTotal).toBeGreaterThan(result.originalTotal);
        });
      }).toThrow(/Property failed/);

      const summaries = processor.getSummaries();
      const failedSummary = summaries.find(
        s => s.ruleReference === 'pricing-strategy.md §1 - Failure Test'
          && s.tags.includes('@failure-test')
          && !s.name.startsWith('invariant.register:')
          && !s.passed
      );
      expect(failedSummary).toBeDefined();
      expect(failedSummary!.passed).toBe(false);
      expect(failedSummary!.failureReason).toBeDefined();
    });
  });
});
