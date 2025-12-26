import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Interaction {
  input: any;
  output: any;
  timestamp: number;
}

class TestTracer {
  private tempFile: string;

  constructor() {
    this.tempFile = path.join(os.tmpdir(), 'vitest-interactions-trace.json');
  }

  log(testName: string, input: any, output: any) {
    const data = this.read();
    if (!data[testName]) {
      data[testName] = [];
    }
    
    data[testName].push({
      input,
      output,
      timestamp: Date.now()
    });
    this.write(data);
  }

  get(testName: string): Interaction[] {
    const data = this.read();
    return data[testName] || [];
  }
  
  getAll(): Record<string, Interaction[]> {
    return this.read();
  }

  clear() {
    if (fs.existsSync(this.tempFile)) {
      fs.unlinkSync(this.tempFile);
    }
  }

  private read(): Record<string, Interaction[]> {
    try {
      if (fs.existsSync(this.tempFile)) {
        return JSON.parse(fs.readFileSync(this.tempFile, 'utf-8'));
      }
    } catch (e) {
      // Ignore errors
    }
    return {};
  }

  private write(data: Record<string, Interaction[]>) {
    try {
      fs.writeFileSync(this.tempFile, JSON.stringify(data));
    } catch (e) {
      // Ignore
    }
  }
}

export const tracer = new TestTracer();
