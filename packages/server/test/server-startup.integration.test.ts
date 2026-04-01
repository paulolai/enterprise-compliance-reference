/**
 * Server Startup Integration Test
 * 
 * GENERAL PURPOSE TEST: Catches ANY issue that prevents server from starting
 * Not specific to the issues we found - will catch similar issues in the future
 */

import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';

test.describe('Server Startup', () => {
  let serverProcess: ChildProcess;
  
  test.beforeAll(async () => {
    serverProcess = spawn('npx', ['tsx', 'src/server/standalone.ts'], {
      cwd: resolve(__dirname, '../'),
      env: {
        ...process.env,
        PORT: '3001',
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
    
    // Wait for server to start
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
      
      const checkInterval = setInterval(() => {
        if (output.includes('Server listening') || output.includes('listening on')) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  });
  
  test.afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
  
  test('should start without throwing', async () => {
    // GENERAL TEST: Does the server start?
    // Catches: ANY import error, ANY syntax error, ANY missing dependency
    expect(serverProcess).toBeTruthy();
    expect(serverProcess.exitCode).toBeNull();
  });
  
  test('should respond to health check', async () => {
    // GENERAL TEST: Can we hit an endpoint?
    // Catches: ANY routing issue, ANY middleware error
    const response = await fetch('http://localhost:3001/health');
    
    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');
  });
  
  test('should load all API routes without errors', async () => {
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
      expect(response.status).not.toBe(404);
      
      if (response.status === 500) {
        const text = await response.text();
        throw new Error(`Route ${route} returned 500: ${text}`);
      }
    }
  });
});
