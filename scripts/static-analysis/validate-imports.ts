#!/usr/bin/env tsx
/**
 * Import Validator
 * 
 * Detects broken imports that would fail at runtime.
 * Runs statically without starting the server.
 */

import { readFileSync, existsSync } from 'fs';
import { glob } from 'glob';
import { join, dirname, resolve } from 'path';

interface ImportIssue {
  file: string;
  line: number;
  import: string;
  issue: string;
  suggestion: string;
}

const issues: ImportIssue[] = [];

// Known broken patterns based on exploratory testing findings
const BROKEN_PATTERNS = [
  {
    pattern: /@executable-specs\/shared\/index-server/,
    forbiddenExports: ['db', 'close', 'seedProducts'],
    reason: 'These exports were moved to @executable-specs/server',
    suggestion: 'Import from local module instead'
  }
];

async function validateImports() {
  console.log('🔍 Import Validator\n');
  
  // Find all TypeScript files in server package
  const files = await glob('packages/server/src/**/*.ts', {
    absolute: true,
    cwd: process.cwd()
  });
  
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for broken import patterns
      for (const { pattern, forbiddenExports, reason, suggestion } of BROKEN_PATTERNS) {
        if (pattern.test(line)) {
          // Check if any forbidden export is imported
          for (const exportName of forbiddenExports) {
            const exportPattern = new RegExp(`\\b${exportName}\\b`);
            if (exportPattern.test(line)) {
              issues.push({
                file: file.replace(process.cwd(), ''),
                line: i + 1,
                import: line.trim(),
                issue: `${exportName} not exported from ${line.match(pattern)![0]}: ${reason}`,
                suggestion
              });
            }
          }
        }
      }
      
      // Check for missing local imports that should exist
      const localImportMatch = line.match(/from ['"]\.\.\/([^'"]+)['"]/);
      if (localImportMatch) {
        const importPath = localImportMatch[1];
        const currentDir = dirname(file);
        const resolvedPath = resolve(currentDir, '..', importPath);
        
        // Check if file exists (with .ts extension)
        const exists = existsSync(resolvedPath + '.ts') || 
                      existsSync(resolvedPath + '/index.ts');
        
        if (!exists) {
          issues.push({
            file: file.replace(process.cwd(), ''),
            line: i + 1,
            import: line.trim(),
            issue: `Import path does not resolve to an existing file`,
            suggestion: `Check if ${importPath}.ts or ${importPath}/index.ts exists`
          });
        }
      }
    }
  }
  
  // Report results
  if (issues.length === 0) {
    console.log('✅ No import issues found\n');
    return 0;
  }
  
  console.log(`❌ Found ${issues.length} import issue(s):\n`);
  
  for (const issue of issues) {
    console.log(`📄 ${issue.file}:${issue.line}`);
    console.log(`   Import: ${issue.import}`);
    console.log(`   Issue: ${issue.issue}`);
    console.log(`   Suggestion: ${issue.suggestion}\n`);
  }
  
  return 1;
}

validateImports().then(code => process.exit(code));
