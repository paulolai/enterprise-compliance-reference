import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { InvariantSpanProcessor, PricingEdgeCaseStrategy } from './invariant-span-processor';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

export interface OtelConfig {
  mode: 'test' | 'production';
  serviceName: string;
  endpoint?: string;
}

let sdk: NodeSDK | null = null;
let spanExporter: InMemorySpanExporter | null = null;
let invariantProcessor: InvariantSpanProcessor | null = null;

export function setupOtel(config: OtelConfig) {
  if (sdk) return { sdk, spanExporter, invariantProcessor };

  const traceExporter = config.mode === 'test'
    ? new InMemorySpanExporter()
    : new OTLPTraceExporter({ url: config.endpoint || 'http://localhost:4317' });

  const metricReader = config.mode === 'production'
    ? new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: config.endpoint || 'http://localhost:4317' }),
      })
    : undefined;

  if (config.mode === 'test') {
    spanExporter = traceExporter as InMemorySpanExporter;
    invariantProcessor = new InvariantSpanProcessor({ edgeCaseStrategy: new PricingEdgeCaseStrategy() });
  }

  const spanProcessors = config.mode === 'test'
    ? [new SimpleSpanProcessor(traceExporter), invariantProcessor!]
    : [new SimpleSpanProcessor(traceExporter)];

  sdk = new NodeSDK({
    serviceName: config.serviceName,
    spanProcessors,
    instrumentations: [getNodeAutoInstrumentations()],
    metricReader,
  });

  sdk.start();
  return { sdk, spanExporter, invariantProcessor };
}

export async function shutdownOtel() {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    spanExporter = null;
    invariantProcessor = null;
  }
}

export function getInvariantProcessor(): InvariantSpanProcessor | null {
  return invariantProcessor;
}
