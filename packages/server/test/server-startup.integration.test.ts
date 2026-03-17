/**
 * Server Startup Integration Test
 * 
 * GENERAL PURPOSE TEST: Catches ANY issue that prevents server from starting
 * Not specific to the issues we found - will catch similar issues in the future
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { resolve } from 'path';

describe('Server Startup', () => {
  let serverProcess: ReturnType<typeof spawn>;
  let serverUrl: string;
  
  it('should start without throwing', async () => {
    // GENERAL TEST: Does the server start?
    // Catches: ANY import error, ANY syntax error, ANY missing dependency
    const startTime = Date.now();
    
    serverProcess = spawn('npx', ['tsx', 'src/server/standalone.ts'], {
      cwd: resolve(__dirname, '../'),
      env: {
        ...process.env,
        PORT: '3001', // Use different port for testing
        NODE_ENV: 'test'
      }
    });
    
    let output = '';
    let errorOutput = '';
    
    serverProcess.stdout?.on('data', (data) => {
      output += data.toString();
    });
    
    serverProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // Wait for server to start or fail
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server failed to start within 10 seconds'));
      }, 10000);
      
      serverProcess.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(
            `Server exited with code ${code}\n\nSTDOUT:\n${output}\n\nSTDERR:\n${errorOutput}`
          ));
        }
      });
      
      // Check for successful startup message
      const checkInterval = setInterval(() => {
        if (output.includes('Server listening') || output.includes('listening on')) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
    
    const startupTime = Date.now() - startTime;
    console.log(`Server started in ${startupTime}ms`);
    
    expect(startupTime).toBeLessThan(10000);
  }, 15000);
  
  it('should respond to health check', async () => {
    // GENERAL TEST: Can we hit an endpoint?
    // Catches: ANY routing issue, ANY middleware error
    const response = await fetch('http://localhost:3001/health');
    
    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');
  });
  
  it('should load all API routes without errors', async () => {
    // GENERAL TEST: Are all API routes registered?
    // Catches: ANY route registration failure, ANY import error in routes
    const routes = [
      '/api/products',
      '/api/pricing/calculate',
      '/api/health',
      '/readyz',
      '/livez'
    ];
    
    for (const route of routes) {
      const response = await fetch(`http://localhost:3001${route}`);
      // Should not be 404 (route not found) or 500 (error in route)
      expect(response.status).not.toBe(404);
      
      if (response.status === 500) {
        const text = await response.text();
        throw new Error(`Route ${route} returned 500: ${text}`);
      }
    }
  });
  
  afterAll(async () => {
    // Cleanup: kill server process
    if (serverProcess) {
      serverProcess.kill();
      // Wait for process to exit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
});
