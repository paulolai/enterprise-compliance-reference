import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Interaction {
  input: any;
  output: any;
  timestamp: number;
}

// Log entry structure for append-only file
interface LogEntry {
  testName: string;
  interaction: Interaction;
}

class TestTracer {
  private tempFile: string;

  constructor() {
    this.tempFile = path.join(os.tmpdir(), 'vitest-interactions-trace.jsonl'); // .jsonl for JSON Lines
  }

  log(testName: string, input: any, output: any) {
    const entry: LogEntry = {
      testName,
      interaction: {
        input,
        output,
        timestamp: Date.now()
      }
    };
    
    // Atomic append to file
    try {
      fs.appendFileSync(this.tempFile, JSON.stringify(entry) + '\n');
    } catch (e) {
      console.error('Failed to write trace:', e);
    }
  }

  get(testName: string): Interaction[] {
    const allLogs = this.readAll();
    return allLogs[testName] || [];
  }
  
  getAll(): Record<string, Interaction[]> {
    return this.readAll();
  }

  clear() {
    if (fs.existsSync(this.tempFile)) {
      fs.unlinkSync(this.tempFile);
    }
  }

  private readAll(): Record<string, Interaction[]> {
    const data: Record<string, Interaction[]> = {};
    
    try {
      if (fs.existsSync(this.tempFile)) {
        const fileContent = fs.readFileSync(this.tempFile, 'utf-8');
        const lines = fileContent.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const entry: LogEntry = JSON.parse(line);
            if (!data[entry.testName]) {
              data[entry.testName] = [];
            }
            data[entry.testName].push(entry.interaction);
          } catch (e) {
            // Ignore corrupted lines
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }
    
    return data;
  }
}

export const tracer = new TestTracer();