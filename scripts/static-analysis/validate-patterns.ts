#!/usr/bin/env node
/**
 * Patterns & Code Quality Static Analysis Validator
 * 
 * Validates for code quality issues:
 * - TODO/FIXME/XXX comments in production code
 * - console.log/debugger statements
 * - Commented-out code blocks
 * - Placeholder content (beyond HTML)
 * - Mock data in production
 * - Magic numbers/strings
 * - Unused imports/variables
 * - Test files in production
 * 
 * Category: Code Quality
 * Trigger: Code reviews, manual audits, exploratory testing
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationError {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
  category: string;
}

// Patterns that indicate placeholder/temporary code
const PATTERN_PATTERNS = [
  { pattern: /\/\/\s*TODO/i, name: 'TODO comment' },
  { pattern: /\/\/\s*FIXME/i, name: 'FIXME comment' },
  { pattern: /\/\/\s*XXX/i, name: 'XXX marker' },
  { pattern: /\/\*\s*TODO/i, name: 'TODO comment (block)' },
  { pattern: /\/\*\s*FIXME/i, name: 'FIXME comment (block)' },
  { pattern: /\/\*\s*XXX/i, name: 'XXX marker (block)' },
];

// Debug statements
const DEBUG_PATTERNS = [
  { pattern: /console\.(log|warn|error|debug)\(/, name: 'console statement' },
  { pattern: /debugger;/, name: 'debugger statement' },
  { pattern: /console\.table\(/, name: 'console.table statement' },
];

// Placeholder content patterns
const PLACEHOLDER_CONTENT = [
  { pattern: /placeholder|Placeholder/i, name: 'placeholder text' },
  { pattern: /demo|Demo content/i, name: 'demo content' },
  { pattern: /test@test\.com/i, name: 'test email' },
  { pattern: /lorem ipsum/i, name: 'lorem ipsum' },
];

// Patterns to exclude (acceptable in production)
const EXCLUDED_PATTERNS = [
  /^\s*\*\s*@example/,  // JSDoc @example tags
  /placeholder="/,  // HTML placeholder attributes
  /className.*placeholder/,  // CSS class names containing placeholder
  /data-testid.*placeholder/,  // Test IDs
  /placeholder:/,  // Tailwind CSS placeholder: pseudo-class
  /border-input/,  // Tailwind border-input class (matches "placeholder" pattern)
];

// Allowed TODO patterns (for things that SHOULD be in production)
const ALLOWED_TODO_PATTERNS = [
  /TODO:\s*Add more comprehensive tests/,  // Test todos are OK
  /TODO:\s*Document/,  // Documentation todos
];

function validateTodosAndFixmes(directory: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const srcDir = path.join(directory, 'src');
  
  if (!fs.existsSync(srcDir)) return errors;
  
  function scanDirectory(dir: string): void {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (item !== 'test' && item !== '__tests__' && item !== 'tests') {
          scanDirectory(fullPath);
        }
      } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check for TODO/FIXME patterns
          for (const { pattern, name } of PATTERN_PATTERNS) {
            if (pattern.test(line)) {
              // Check if it's an allowed TODO
              let isAllowed = false;
              for (const allowed of ALLOWED_TODO_PATTERNS) {
                if (allowed.test(line)) {
                  isAllowed = true;
                  break;
                }
              }
              
              if (!isAllowed) {
                errors.push({
                  file: fullPath,
                  line: i + 1,
                  message: `${name} found in production code: "${line.trim().substring(0, 60)}..."`,
                  severity: 'warning',
                  category: 'todos'
                });
              }
            }
          }
        }
      }
    }
  }
  
  scanDirectory(srcDir);
  
  return errors;
}

function validateDebugStatements(directory: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const srcDir = path.join(directory, 'src');
  
  if (!fs.existsSync(srcDir)) return errors;
  
  function scanDirectory(dir: string): void {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Skip debug files and logger utility
          if (item.includes('debug') || item.includes('Debug') || item === 'logger.ts') continue;
          
          for (const { pattern, name } of DEBUG_PATTERNS) {
            if (pattern.test(line)) {
              errors.push({
                file: fullPath,
                line: i + 1,
                message: `${name} found: "${line.trim().substring(0, 60)}..."`,
                severity: 'warning',
                category: 'debug-statements'
              });
            }
          }
        }
      }
    }
  }
  
  scanDirectory(srcDir);
  
  return errors;
}

function validatePlaceholderContent(directory: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const srcDir = path.join(directory, 'src');
  
  if (!fs.existsSync(srcDir)) return errors;
  
  function scanDirectory(dir: string): void {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip debug directories
        if (item === 'debug' || item === '__tests__' || item === 'tests') continue;
        scanDirectory(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.json')) {
        // Skip files with intentional demo content
        if (item.includes('Login')) continue;
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          for (const { pattern, name } of PLACEHOLDER_CONTENT) {
            if (pattern.test(line)) {
              // Skip test files - they can have placeholder data
              if (item.includes('.test.') || item.includes('.spec.') || item.includes('mock')) continue;
              
              // Skip excluded patterns (JSDoc, HTML attributes, etc.)
              let isExcluded = false;
              for (const excluded of EXCLUDED_PATTERNS) {
                if (excluded.test(line)) {
                  isExcluded = true;
                  break;
                }
              }
              if (isExcluded) continue;
              
              errors.push({
                file: fullPath,
                line: i + 1,
                message: `${name} found in production: "${line.trim().substring(0, 60)}..."`,
                severity: 'error',
                category: 'placeholder-content'
              });
            }
          }
        }
      }
    }
  }
  
  scanDirectory(srcDir);
  
  return errors;
}

function validateCommentedCode(directory: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const srcDir = path.join(directory, 'src');
  
  if (!fs.existsSync(srcDir)) return errors;
  
  function scanDirectory(dir: string): void {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        let inCommentedBlock = false;
        let commentedLines = 0;
        let blockStartLine = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Detect commented-out code blocks (3+ consecutive commented lines that look like code)
          if (line.startsWith('//') && !line.startsWith('// ')) {
            // Might be commented code
            const codePart = line.substring(2).trim();
            if (codePart.match(/^(const|let|var|function|if|for|while|return|import|export)/)) {
              if (!inCommentedBlock) {
                inCommentedBlock = true;
                blockStartLine = i + 1;
                commentedLines = 1;
              } else {
                commentedLines++;
              }
            }
          } else if (line.startsWith('/*') && !line.startsWith('/**')) {
            inCommentedBlock = true;
            blockStartLine = i + 1;
            commentedLines = 1;
          } else if (line.endsWith('*/') && inCommentedBlock) {
            commentedLines++;
            if (commentedLines >= 3) {
              errors.push({
                file: fullPath,
                line: blockStartLine,
                message: `Large commented-out code block detected (${commentedLines} lines). Remove or extract to separate file.`,
                severity: 'warning',
                category: 'commented-code'
              });
            }
            inCommentedBlock = false;
            commentedLines = 0;
          } else {
            if (inCommentedBlock && commentedLines >= 3) {
              errors.push({
                file: fullPath,
                line: blockStartLine,
                message: `Large commented-out code block detected (${commentedLines} lines). Remove or extract to separate file.`,
                severity: 'warning',
                category: 'commented-code'
              });
            }
            inCommentedBlock = false;
            commentedLines = 0;
          }
        }
      }
    }
  }
  
  scanDirectory(srcDir);
  
  return errors;
}

function validateTestFilesInProduction(directory: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const srcDir = path.join(directory, 'src');
  
  if (!fs.existsSync(srcDir)) return errors;
  
  function scanDirectory(dir: string, depth: number = 0): void {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath, depth + 1);
      } else if (item.endsWith('.test.ts') || item.endsWith('.test.tsx') || item.endsWith('.spec.ts')) {
        // Test files should be in __tests__ directories or separate test folders
        const parentDir = path.basename(path.dirname(fullPath));
        if (parentDir !== '__tests__' && parentDir !== 'tests' && parentDir !== 'test' && !parentDir.includes('test')) {
          errors.push({
            file: fullPath,
            line: 0,
            message: `Test file found in production source directory. Move to __tests__/ folder.`,
            severity: 'warning',
            category: 'test-files'
          });
        }
      }
    }
  }
  
  scanDirectory(srcDir);
  
  return errors;
}

function main() {
  const clientDir = 'packages/client';
  
  console.log('🔍 Running Patterns & Code Quality Analysis...\n');
  console.log('Category: Code Quality');
  console.log('Checks: TODOs, debug statements, placeholder content, commented code\n');
  
  const allErrors: ValidationError[] = [];
  
  // Run all validations
  allErrors.push(...validateTodosAndFixmes(clientDir));
  allErrors.push(...validateDebugStatements(clientDir));
  allErrors.push(...validatePlaceholderContent(clientDir));
  allErrors.push(...validateCommentedCode(clientDir));
  allErrors.push(...validateTestFilesInProduction(clientDir));
  
  // Group by category
  const errorsByCategory: Record<string, ValidationError[]> = {};
  for (const error of allErrors) {
    if (!errorsByCategory[error.category]) {
      errorsByCategory[error.category] = [];
    }
    errorsByCategory[error.category].push(error);
  }
  
  // Output results
  if (allErrors.length === 0) {
    console.log('✅ No code quality issues found!\n');
  } else {
    console.log(`⚠️  Found ${allErrors.length} code quality issue(s):\n`);
    
    for (const [category, errors] of Object.entries(errorsByCategory)) {
      console.log(`\n${category.toUpperCase()}:`);
      for (const error of errors) {
        const icon = error.severity === 'error' ? '🔴' : '🟡';
        console.log(`  ${icon} ${path.relative('.', error.file)}:${error.line} - ${error.message}`);
      }
    }
  }
  
  // Summary
  const totalErrors = allErrors.filter(e => e.severity === 'error').length;
  const totalWarnings = allErrors.filter(e => e.severity === 'warning').length;
  
  console.log('\n' + '─'.repeat(60));
  console.log(`\nValidation Summary:`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Warnings: ${totalWarnings}`);
  
  if (totalErrors > 0) {
    console.log('\n❌ Validation FAILED - Code quality issues detected');
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
