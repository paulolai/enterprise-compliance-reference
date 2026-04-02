import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { InMemorySpanExporter, BasicTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

describe('OpenTelemetry Setup', () => {
  let exporter: InMemorySpanExporter;
  let provider: BasicTracerProvider;

  beforeAll(() => {
    exporter = new InMemorySpanExporter();
    provider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });
    trace.setGlobalTracerProvider(provider);
  });

  afterAll(async () => {
    await provider.shutdown();
  });

  it('creates spans with invariant attributes', () => {
    const tracer = trace.getTracer('test');
    
    const span = tracer.startSpan('test-invariant', {
      attributes: {
        'invariant.ruleReference': 'pricing-strategy.md §2',
        'invariant.rule': 'Bulk discount for 3+ items',
        'invariant.tags': ['@pricing', '@bulk'],
        'invariant.user.tenureYears': 1,
      },
    });
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('test-invariant');
    expect(spans[0].attributes['invariant.ruleReference']).toBe('pricing-strategy.md §2');
    expect(spans[0].status.code).toBe(SpanStatusCode.OK);
  });

  it('records failed spans correctly', () => {
    const tracer = trace.getTracer('test');
    
    const span = tracer.startSpan('failing-invariant');
    span.setStatus({ code: SpanStatusCode.ERROR, message: 'Assertion failed' });
    span.end();

    const spans = exporter.getFinishedSpans();
    const lastSpan = spans[spans.length - 1];
    expect(lastSpan.status.code).toBe(SpanStatusCode.ERROR);
    expect(lastSpan.status.message).toBe('Assertion failed');
  });
});
