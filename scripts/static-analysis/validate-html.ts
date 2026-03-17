#!/usr/bin/env node
/**
 * HTML Validation Script
 * 
 * Validates HTML files for:
 * - Placeholder titles (react-playwright, vite, placeholder patterns)
 * - Missing title tag
 * - Title that's too short (< 5 characters)
 * 
 * This catches issues that exploratory testing shouldn't need to find.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationError {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

const PLACEHOLDER_PATTERNS = [
  /react-\w+/i,
  /vite\w*/i,
  /placeholder/i,
  /untitled/i,
  /default/i,
  /example/i,
  /demo/i,
];

function validateHtmlFile(filePath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  let titleFound = false;
  let titleContent = '';
  let titleLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for title tag
    const titleMatch = line.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      titleFound = true;
      titleContent = titleMatch[1].trim();
      titleLine = i + 1;
      
      // Check for placeholder patterns
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(titleContent)) {
          errors.push({
            file: filePath,
            line: titleLine,
            message: `Placeholder title detected: "${titleContent}" matches pattern "${pattern.source}"`,
            severity: 'error'
          });
        }
      }
      
      // Check title length
      if (titleContent.length < 5) {
        errors.push({
          file: filePath,
          line: titleLine,
          message: `Title is too short (${titleContent.length} chars): "${titleContent}". Should be at least 5 characters.`,
          severity: 'error'
        });
      }
      
      // Check if title is empty
      if (titleContent.length === 0) {
        errors.push({
          file: filePath,
          line: titleLine,
          message: 'Title tag is empty',
          severity: 'error'
        });
      }
    }
  }
  
  if (!titleFound) {
    errors.push({
      file: filePath,
      line: 0,
      message: 'No <title> tag found in HTML',
      severity: 'error'
    });
  }
  
  return errors;
}

function main() {
  const htmlFiles = [
    'packages/client/index.html'
  ];
  
  console.log('🔍 Validating HTML files...\n');
  
  let totalErrors = 0;
  let totalWarnings = 0;
  
  for (const file of htmlFiles) {
    const fullPath = path.resolve(file);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${file}`);
      continue;
    }
    
    const errors = validateHtmlFile(fullPath);
    
    if (errors.length === 0) {
      console.log(`✅ ${file} - Valid`);
    } else {
      console.log(`❌ ${file} - ${errors.length} issue(s) found:`);
      for (const error of errors) {
        const icon = error.severity === 'error' ? '🔴' : '🟡';
        console.log(`   ${icon} Line ${error.line}: ${error.message}`);
        
        if (error.severity === 'error') {
          totalErrors++;
        } else {
          totalWarnings++;
        }
      }
    }
    console.log();
  }
  
  console.log('─'.repeat(50));
  console.log(`\nValidation complete:`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Warnings: ${totalWarnings}`);
  
  if (totalErrors > 0) {
    console.log('\n❌ Validation FAILED - Fix errors before committing');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('\n⚠️  Validation passed with warnings');
    process.exit(0);
  } else {
    console.log('\n✅ All validations passed!');
    process.exit(0);
  }
}

main();
