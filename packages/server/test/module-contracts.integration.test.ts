/**
 * Module Contract Integration Tests
 * 
 * GENERAL PURPOSE TESTS: Verify module contracts without hardcoding specific exports
 * Catches broken imports, missing exports, type mismatches
 */

import { describe, it, expect } from 'vitest';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Module Contracts', () => {
  it('should only import available exports from @executable-specs/shared', async () => {
    // GENERAL TEST: Verify all imports from shared module are resolvable
    // Catches: Refactored shared modules, moved exports, renamed symbols
    
    const sharedModulePath = resolve(__dirname, '../../shared/src/index.ts');
    const sharedContent = readFileSync(sharedModulePath, 'utf-8');
    
    // Extract exports from shared module
    const exportMatches = sharedContent.match(/export\s+(?:const|function|class|type|interface)\s+(\w+)/g) || [];
    const reExportMatches = sharedContent.match(/export\s*\{([^}]+)\}/g) || [];
    
    const availableExports = new Set([
      ...exportMatches.map(m => m.split(/\s+/).pop()!),
      ...reExportMatches.flatMap(m => 
        m.replace(/export\s*\{|\}/g, '').split(',').map(s => s.trim().split(/\s+as\s+/).pop()!)
      )
    ]);
    
    // Find all files that import from shared
    const serverFiles = await glob('src/**/*.ts', {
      cwd: resolve(__dirname, '../'),
      absolute: true
    });
    
    const invalidImports: string[] = [];
    
    for (const file of serverFiles) {
      const content = readFileSync(file, 'utf-8');
      const importMatches = content.match(/from\s+['"]@executable-specs\/shared[^'"]*['"]/g) || [];
      
      for (const importLine of importMatches) {
        // Extract what's being imported
        const importPattern = /import\s*\{([^}]+)\}/;
        const match = content.match(importPattern);
        
        if (match) {
          const importedNames = match[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()!);
          
          for (const name of importedNames) {
            // Check if this export exists in shared module
            if (!availableExports.has(name)) {
              invalidImports.push(`${file}: imports '${name}' from shared, but it's not exported`);
            }
          }
        }
      }
    }
    
    if (invalidImports.length > 0) {
      throw new Error(
        `Module contract violations found:\n${invalidImports.join('\n')}`
      );
    }
  });
  
  it('should not use Vite-specific globals in server code', async () => {
    // GENERAL TEST: Ensure server code doesn't assume Vite environment
    // Catches: import.meta.env usage, Vite-specific APIs
    
    const viteGlobals = [
      'import.meta.env',
      'import.meta.hot',
      'import.meta.glob'
    ];
    
    const serverFiles = await glob('src/**/*.ts', {
      cwd: resolve(__dirname, '../'),
      absolute: true
    });
    
    const violations: string[] = [];
    
    for (const file of serverFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        for (const global of viteGlobals) {
          if (lines[i].includes(global)) {
            violations.push(`${file}:${i + 1}: Uses ${global}`);
          }
        }
      }
    }
    
    if (violations.length > 0) {
      throw new Error(
        `Vite globals found in server code (use process.env instead):\n${violations.join('\n')}`
      );
    }
  });
  
  it('should have all required exports for server startup', async () => {
    // GENERAL TEST: Server entry points can load their dependencies
    // Catches: Missing exports, circular dependencies, broken module graphs
    
    const entryPoints = [
      'src/server/index.ts',
      'src/server/standalone.ts',
      'src/db/index.ts',
      'src/lib/env.ts'
    ];
    
    const missingExports: string[] = [];
    
    for (const entry of entryPoints) {
      const entryPath = resolve(__dirname, '../', entry);
      
      if (!require.resolve(entryPath)) {
        missingExports.push(`Cannot resolve ${entry}`);
        continue;
      }
      
      try {
        // Try to require the module - this will fail if imports are broken
        delete require.cache[require.resolve(entryPath)];
        require(entryPath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        missingExports.push(`${entry}: ${message}`);
      }
    }
    
    if (missingExports.length > 0) {
      throw new Error(
        `Failed to load server modules:\n${missingExports.join('\n')}`
      );
    }
  });
});
