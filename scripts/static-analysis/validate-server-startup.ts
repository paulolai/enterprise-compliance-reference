#!/usr/bin/env tsx
/**
 * Server Startup Validator
 * 
 * Detects common patterns that cause server startup failures.
 * Uses pattern-based detection, not hardcoded file checks.
 */

import { readFileSync, existsSync } from 'fs';
import { glob } from 'glob';
import { join } from 'path';

interface StartupIssue {
  type: 'import' | 'env-var' | 'config';
  file: string;
  line: number;
  message: string;
}

const issues: StartupIssue[] = [];

// Pattern-based detection rules
const DETECTION_RULES = [
  {
    id: 'import-meta-env-in-server',
    name: 'import.meta.env in server code',
    description: 'Server-side code should use process.env, not import.meta.env',
    filePattern: 'packages/server/**/*.ts',
    linePattern: /import\.meta\.env/,
    severity: 'high'
  },
  {
    id: 'shared-module-db-import',
    name: 'Importing db from shared module',
    description: 'Database exports moved to server package',
    filePattern: 'packages/server/**/*.ts',
    linePattern: /@executable-specs\/shared.*\bimport\b.*\bdb\b/,
    severity: 'high'
  },
  {
    id: 'shared-module-close-import',
    name: 'Importing close from shared module',
    description: 'Database close function moved to server package',
    filePattern: 'packages/server/**/*.ts',
    linePattern: /@executable-specs\/shared.*\bimport\b.*\bclose\b/,
    severity: 'high'
  }
];

async function validateServerStartup() {
  console.log('🔍 Server Startup Validator\n');
  console.log('Scanning for common startup failure patterns...\n');
  
  for (const rule of DETECTION_RULES) {
    const files = await glob(rule.filePattern, {
      absolute: true,
      cwd: process.cwd()
    });
    
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        if (rule.linePattern.test(lines[i])) {
          issues.push({
            type: rule.linePattern.source.includes('import') ? 'import' : 'env-var',
            file: file.replace(process.cwd(), ''),
            line: i + 1,
            message: `${rule.name}: ${rule.description}`
          });
        }
      }
    }
  }
  
  // Report results
  if (issues.length === 0) {
    console.log('✅ No startup failure patterns detected\n');
    return 0;
  }
  
  console.log(`❌ Found ${issues.length} pattern(s) that would cause startup failures:\n`);
  
  for (const issue of issues) {
    console.log(`   📄 ${issue.file}:${issue.line}`);
    console.log(`      ${issue.message}\n`);
  }
  
  console.log('💡 See docs/issue-fixes-log.md for solutions\n');
  
  return 1;
}

validateServerStartup().then(code => process.exit(code));
