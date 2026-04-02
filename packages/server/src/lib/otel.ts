import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import type { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import * as fs from 'fs';

/**
 * Simple file-based span exporter that writes spans as JSONL.
 * Compatible with OTel SDK v2 — avoids the broken third-party package.
 */
class JsonlFileExporter implements SpanExporter {
  private filePath: string;
  private stream: fs.WriteStream | null = null;
  private isShutDown = false;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.stream = fs.createWriteStream(filePath, { flags: 'a' });
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    if (this.isShutDown || !this.stream) {
      resultCallback({ code: ExportResultCode.FAILED, error: new Error('Exporter shutdown') });
      return;
    }

    for (const span of spans) {
      const line = JSON.stringify({
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
        name: span.name,
        kind: span.kind,
        startTime: span.startTime,
        endTime: span.endTime,
        status: span.status,
        attributes: span.attributes,
        resource: {
          serviceName: span.resource.attributes['service.name'],
        },
      }) + '\n';
      this.stream.write(line);
    }

    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  async shutdown(): Promise<void> {
    this.isShutDown = true;
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
  }

  async forceFlush(): Promise<void> {
    // WriteStream handles buffering automatically
  }
}

let sdk: NodeSDK | null = null;

/**
 * Start OpenTelemetry with automatic configuration based on environment.
 *
 * Priority:
 * 1. OTEL_EXPORTER_OTLP_ENDPOINT → exports to remote collector (e.g. SigNoz)
 * 2. OTEL_FILE_EXPORTER_PATH     → writes traces to JSONL file (CI/local)
 * 3. Neither set                 → no-op (no overhead)
 */
export function startOtel() {
  const remoteEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const filePath = process.env.OTEL_FILE_EXPORTER_PATH;

  if (!remoteEndpoint && !filePath) {
    return null; // No-op — no overhead in dev without config
  }

  const traceExporter: SpanExporter = remoteEndpoint
    ? new OTLPTraceExporter({ url: `${remoteEndpoint}/v1/traces` })
    : new JsonlFileExporter(filePath || 'otel-traces.jsonl');

  sdk = new NodeSDK({
    serviceName: 'executable-specs-api',
    traceExporter,
    metricReader: remoteEndpoint
      ? new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({ url: `${remoteEndpoint}/v1/metrics` }),
        })
      : undefined,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req) => {
            return req.url === '/health' || req.url === '/metrics';
          },
        },
      }),
    ],
  });

  sdk.start();

  if (filePath) {
    console.log(`[OTel] File exporter enabled — traces written to ${filePath}`);
  } else {
    console.log(`[OTel] Remote exporter enabled — sending to ${remoteEndpoint}`);
  }

  return sdk;
}

export async function shutdownOtel() {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
