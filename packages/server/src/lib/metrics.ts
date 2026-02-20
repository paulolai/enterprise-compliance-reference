/**
 * Server metrics stub
 */
class MetricsCollector {
  private data: Map<string, number> = new Map();

  increment(name: string, value = 1): void {
    const current = this.data.get(name) || 0;
    this.data.set(name, current + value);
  }

  gauge(name: string, value: number): void {
    this.data.set(name, value);
  }

  exportPrometheus(): string {
    const lines: string[] = [];
    this.data.forEach((value, name) => {
      lines.push(`${name} ${value}`);
    });
    return lines.join('\n');
  }
}

export const metrics = new MetricsCollector();
