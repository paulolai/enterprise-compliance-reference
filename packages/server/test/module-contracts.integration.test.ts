/**
 * Module Contract Integration Tests
 * 
 * GENERAL PURPOSE TESTS: Verify module contracts without hardcoding specific exports
 * Catches broken imports, missing exports, type mismatches
 */

import { describe, it, expect } from 'vitest';
import { globSync } from 'glob';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Module Contracts', () => {
  it('should only import available exports from @executable-specs/shared', async () => {
    // GENERAL TEST: Verify all imports from shared module are resolvable
    // Catches: Refactored shared modules, moved exports, renamed symbols
    
    // Build the set of available exports by combining direct exports and re-exports
    const sharedModulePath = resolve(__dirname, '../../shared/src/index.ts');
    const sharedContent = readFileSync(sharedModulePath, 'utf-8');
    
    const availableExports = new Set<string>();
    
    // Direct exports: export { foo, bar } or export const/function/class/type/interface
    const directExports = sharedContent.match(/export\s+(?:const|function|class|type|interface|enum)\s+(\w+)/g) || [];
    for (const m of directExports) {
      const name = m.split(/\s+/).pop();
      if (name) availableExports.add(name);
    }
    
    const reExportBlocks = sharedContent.match(/export\s*\{([^}]+)\}/g) || [];
    for (const block of reExportBlocks) {
      const names = block.replace(/export\s*\{|\}/g, '').split(',').map(s => s.trim().split(/\s+as\s+/).pop()!);
      for (const name of names) {
        if (name) availableExports.add(name);
      }
    }
    
    // Re-exports from other packages: export * from '...'
    // For these, we need to check the actual module's exports
    const reExportFromMatches = sharedContent.match(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g) || [];
    for (const reExport of reExportFromMatches) {
      const pkgMatch = reExport.match(/from\s+['"]([^'"]+)['"]/);
      if (pkgMatch) {
        const pkgPath = pkgMatch[1];
        // For local modules (starting with ./), read the file directly
        if (pkgPath.startsWith('./')) {
          const modFilePath = resolve(__dirname, '../../shared/src', pkgPath + '.ts');
          try {
            const modContent = readFileSync(modFilePath, 'utf-8');
            const modExports = modContent.match(/export\s+(?:const|function|class|type|interface|enum|const\s+)\s+(\w+)/g) || [];
            for (const m of modExports) {
              const name = m.split(/\s+/).pop();
              if (name) availableExports.add(name);
            }
          } catch {
            // File might not exist or might be a directory index
          }
        }
        // For workspace packages, read their index.ts
        else if (pkgPath === '@executable-specs/domain') {
          const domainIndexPath = resolve(__dirname, '../../domain/src/index.ts');
          const domainContent = readFileSync(domainIndexPath, 'utf-8');
          // Domain uses export * from './types' etc.
          const domainReExports = domainContent.match(/export\s+\*\s+from\s+['"]\.\/([^'"]+)['"]/g) || [];
          for (const de of domainReExports) {
            const modMatch = de.match(/from\s+['"]\.\/([^'"]+)['"]/);
            if (modMatch) {
              const modPath = resolve(__dirname, '../../domain/src', modMatch[1] + '.ts');
              try {
                const modContent = readFileSync(modPath, 'utf-8');
                const modExports = modContent.match(/export\s+(?:const|function|class|type|interface|enum)\s+(\w+)/g) || [];
                for (const m of modExports) {
                  const name = m.split(/\s+/).pop();
                  if (name) availableExports.add(name);
                }
              } catch {
                // Skip if file doesn't exist
              }
            }
          }
        }
      }
    }
    
    // Find all files that import from shared
    const serverFiles = globSync('src/**/*.ts', {
      cwd: resolve(__dirname, '../'),
      absolute: true
    });
    
    const invalidImports: string[] = [];
    
    for (const file of serverFiles) {
      const content = readFileSync(file, 'utf-8');
      
      // Match full import statements from shared
      const importStatements = content.match(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]@executable-specs\/shared[^'"]*['"]/g) || [];
      
      for (const importStmt of importStatements) {
        const importPattern = /\{([^}]+)\}/;
        const match = importStmt.match(importPattern);
        
        if (match) {
          const importedNames = match[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()!).filter(n => n);
          
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
    
    const serverFiles = globSync('src/**/*.ts', {
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
      
      try {
        // Try to dynamically import the module - this will fail if imports are broken
        await import(`file://${entryPath}`);
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
