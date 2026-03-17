#!/usr/bin/env tsx
/**
 * TypeScript Compilation Validator
 * 
 * Runs tsc --noEmit to catch type errors that would fail at runtime.
 * Much faster than starting the server.
 */

import { spawnSync } from 'child_process';
import { join } from 'path';

interface CompileError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
}

async function validateCompilation() {
  console.log('🔍 TypeScript Compilation Validator\n');
  
  // Run TypeScript compiler in each package
  const packages = [
    'packages/server',
    'packages/domain', 
    'packages/client',
    'packages/shared'
  ];
  
  let totalErrors = 0;
  const allErrors: CompileError[] = [];
  
  for (const pkg of packages) {
    const cwd = join(process.cwd(), pkg);
    
    console.log(`📦 Checking ${pkg}...`);
    
    const result = spawnSync('npx', ['tsc', '--noEmit'], {
      cwd,
      encoding: 'utf-8',
      shell: true
    });
    
    if (result.status !== 0 && result.stdout) {
      const errors = parseErrors(result.stdout);
      totalErrors += errors.length;
      allErrors.push(...errors);
    }
  }
  
  // Report results
  if (totalErrors === 0) {
    console.log('\n✅ All packages compile successfully\n');
    return 0;
  }
  
  console.log(`\n❌ Found ${totalErrors} compilation error(s):\n`);
  
  // Group errors by category
  const importErrors = allErrors.filter(e => e.message.includes('does not provide an export'));
  const typeErrors = allErrors.filter(e => !e.message.includes('does not provide an export'));
  
  if (importErrors.length > 0) {
    console.log(`\n📥 BROKEN IMPORTS (${importErrors.length}):`);
    console.log('   These would cause runtime crashes\n');
    
    for (const error of importErrors.slice(0, 10)) {
      console.log(`   📄 ${error.file}:${error.line}`);
      console.log(`      ${error.message}\n`);
    }
    
    if (importErrors.length > 10) {
      console.log(`   ... and ${importErrors.length - 10} more\n`);
    }
  }
  
  if (typeErrors.length > 0) {
    console.log(`\n🔧 TYPE ERRORS (${typeErrors.length}):`);
    
    for (const error of typeErrors.slice(0, 5)) {
      console.log(`   📄 ${error.file}:${error.line}`);
      console.log(`      ${error.message}\n`);
    }
    
    if (typeErrors.length > 5) {
      console.log(`   ... and ${typeErrors.length - 5} more\n`);
    }
  }
  
  return 1;
}

function parseErrors(output: string): CompileError[] {
  const errors: CompileError[] = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    // Parse TypeScript error format: file(line,column): error TS####: message
    const match = line.match(/^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/);
    if (match) {
      errors.push({
        file: match[1].replace(process.cwd(), ''),
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        code: match[4],
        message: match[5]
      });
    }
  }
  
  return errors;
}

validateCompilation().then(code => process.exit(code));
