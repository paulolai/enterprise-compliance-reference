import type { Span, SpanProcessor, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import type { Context } from '@opentelemetry/api';
import type { InvariantSummary } from './tracer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class InvariantSpanProcessor implements SpanProcessor {
  private summaries: Map<string, InvariantSummary> = new Map();
  private metadata: Map<string, { ruleReference: string; rule: string; tags: string[] }> = new Map();
  private runDir: string;

  constructor() {
    this.runDir = path.join(os.tmpdir(), 'vitest-otel-data');
    if (!fs.existsSync(this.runDir)) {
      fs.mkdirSync(this.runDir, { recursive: true });
    }
  }

  forceFlush(): Promise<void> { return Promise.resolve(); }
  shutdown(): Promise<void> { return Promise.resolve(); }

  onStart(_span: Span, _parentContext: Context): void {
    // No-op — we process onEnd
  }

  onEnd(span: ReadableSpan): void {
    const attrs = span.attributes;
    const ruleRef = attrs['invariant.ruleReference'] as string | undefined;
    if (!ruleRef) return; // Not an invariant span

    const name = span.name;
    const passed = span.status.code === 1; // OK
    const rule = (attrs['invariant.rule'] as string) || '';
    const tags = (attrs['invariant.tags'] as string[]) || [];

    // Register metadata
    if (!this.metadata.has(name)) {
      this.metadata.set(name, { ruleReference: ruleRef, rule, tags });
    }

    // Get or create summary
    if (!this.summaries.has(name)) {
      this.summaries.set(name, {
        name,
        ruleReference: ruleRef,
        rule,
        tags,
        totalRuns: 0,
        passed: true,
        edgeCasesCovered: {
          vipUsers: 0, nonVipUsers: 0, exactlyTwoYearTenure: 0,
          bulkItems: 0, nonBulkItems: 0,
          freeShippingQualifying: 0, freeShippingNotQualifying: 0,
          discountCapHit: 0, expressShipping: 0, expeditedShipping: 0,
        },
      });
    }

    const summary = this.summaries.get(name)!;
    summary.totalRuns++;
    if (!passed) {
      summary.passed = false;
      summary.failureReason = span.status.message || 'Unknown failure';
    }

    // Extract edge case data from span attributes
    this.updateEdgeCases(summary, attrs);

    // Persist immediately so reporter can read data in real-time
    this.persistToDisk();
  }

  private updateEdgeCases(summary: InvariantSummary, attrs: Record<string, unknown>) {
    const tenureYears = (attrs['invariant.user.tenureYears'] as number) ?? 0;
    const quantities = attrs['invariant.item.quantities'] as number[] | undefined;
    const isFreeShipping = attrs['invariant.shipment.isFreeShipping'] as boolean | undefined;
    const isCapped = attrs['invariant.isCapped'] as boolean | undefined;
    const shippingMethod = attrs['invariant.shippingMethod'] as string | undefined;

    if (tenureYears > 2) summary.edgeCasesCovered.vipUsers++;
    else summary.edgeCasesCovered.nonVipUsers++;

    if (tenureYears === 2) summary.edgeCasesCovered.exactlyTwoYearTenure++;

    quantities?.forEach(q => {
      if (q >= 3) summary.edgeCasesCovered.bulkItems++;
      else summary.edgeCasesCovered.nonBulkItems++;
    });

    if (isFreeShipping) summary.edgeCasesCovered.freeShippingQualifying++;
    else summary.edgeCasesCovered.freeShippingNotQualifying++;

    if (isCapped) summary.edgeCasesCovered.discountCapHit++;

    if (shippingMethod === 'EXPRESS') summary.edgeCasesCovered.expressShipping++;
    else if (shippingMethod === 'EXPEDITED') summary.edgeCasesCovered.expeditedShipping++;
  }

  getSummaries(): InvariantSummary[] {
    return Array.from(this.summaries.values());
  }

  getMetadata(): Map<string, { ruleReference: string; rule: string; tags: string[] }> {
    return this.metadata;
  }

  clear(): void {
    this.summaries.clear();
    this.metadata.clear();
  }

  private persistToDisk(): void {
    try {
      const metadataEntries = Array.from(this.metadata.entries()).map(([name, data]) => ({
        name,
        ...data
      }));
      fs.writeFileSync(path.join(this.runDir, 'metadata.json'), JSON.stringify(metadataEntries, null, 2));
      fs.writeFileSync(path.join(this.runDir, 'summaries.json'), JSON.stringify(Array.from(this.summaries.values()), null, 2));
    } catch {
      // Silent fail - reporter will handle missing data
    }
  }
}
