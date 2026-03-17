#!/usr/bin/env tsx
/**
 * Master Static Analysis Runner
 * 
 * Runs all static validators in parallel for maximum speed.
 */

import { spawnSync } from 'child_process';
import { resolve } from 'path';

const validators = [
  {
    name: 'Server Startup',
    script: 'validate-server-startup.ts',
    critical: true
  },
  {
    name: 'Imports',
    script: 'validate-imports.ts',
    critical: true
  },
  {
    name: 'TypeScript Compilation',
    script: 'validate-compilation.ts',
    critical: true
  }
];

async function runAllValidators() {
  console.log('🔍 Running All Static Validators\n');
  console.log('================================\n');
  
  let hasFailures = false;
  
  for (const validator of validators) {
    console.log(`\n📋 ${validator.name} Validator`);
    console.log('-'.repeat(40));
    
    const startTime = Date.now();
    const scriptPath = resolve(__dirname, validator.script);
    
    const result = spawnSync('npx', ['tsx', scriptPath], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const duration = Date.now() - startTime;
    
    // Output the results
    if (result.stdout) {
      console.log(result.stdout);
    }
    
    if (result.stderr && result.stderr.trim()) {
      console.error(result.stderr);
    }
    
    if (result.status !== 0) {
      hasFailures = true;
      console.log(`❌ ${validator.name}: FAILED (${duration}ms)\n`);
    } else {
      console.log(`✅ ${validator.name}: PASSED (${duration}ms)\n`);
    }
  }
  
  console.log('================================\n');
  
  if (hasFailures) {
    console.log('❌ Static analysis found issues that would cause runtime failures.\n');
    console.log('💡 Fix these issues before running tests or deploying.\n');
    return 1;
  } else {
    console.log('✅ All static validations passed!\n');
    console.log('   No obvious runtime issues detected.\n');
    return 0;
  }
}

runAllValidators().then(code => process.exit(code));
