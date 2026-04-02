import { describe, it, expect, beforeEach } from 'vitest';
import { InvariantSpanProcessor } from '../src/modules/invariant-span-processor';
import { SpanStatusCode } from '@opentelemetry/api';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor, AlwaysOnSampler } from '@opentelemetry/sdk-trace-base';

describe('InvariantSpanProcessor', () => {
  let processor: InvariantSpanProcessor;
  let exporter: InMemorySpanExporter;
  let provider: BasicTracerProvider;

  beforeEach(() => {
    processor = new InvariantSpanProcessor();
    exporter = new InMemorySpanExporter();
    provider = new BasicTracerProvider({
      spanProcessors: [processor, new SimpleSpanProcessor(exporter)],
      sampler: new AlwaysOnSampler(),
    });
    processor.clear();
    exporter.reset();
  });

  it('aggregates invariant spans into summaries', () => {
    const tracer = provider.getTracer('test');
    
    for (let i = 0; i < 3; i++) {
      const span = tracer.startSpan('VIP discount applied', {
        attributes: {
          'invariant.ruleReference': 'pricing-strategy.md §3',
          'invariant.rule': 'If tenure > 2, 5% discount',
          'invariant.tags': ['@vip', '@pricing'],
          'invariant.user.tenureYears': 5,
          'invariant.item.quantities': [1, 2],
          'invariant.shipment.isFreeShipping': false,
        },
      });
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    }

    const summaries = processor.getSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].totalRuns).toBe(3);
    expect(summaries[0].passed).toBe(true);
    expect(summaries[0].edgeCasesCovered.vipUsers).toBe(3);
  });

  it('marks summary as failed when span fails', () => {
    const tracer = provider.getTracer('test');
    
    const span = tracer.startSpan('Safety valve', {
      attributes: {
        'invariant.ruleReference': 'pricing-strategy.md §4',
        'invariant.rule': 'Max 30% discount',
        'invariant.tags': ['@critical'],
      },
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: 'Discount exceeded 30%' });
    span.end();

    const summaries = processor.getSummaries();
    expect(summaries[0].passed).toBe(false);
    expect(summaries[0].failureReason).toBe('Discount exceeded 30%');
  });

  it('ignores non-invariant spans', () => {
    const tracer = provider.getTracer('test');
    
    const span = tracer.startSpan('HTTP GET /health');
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    expect(processor.getSummaries()).toHaveLength(0);
  });
});
