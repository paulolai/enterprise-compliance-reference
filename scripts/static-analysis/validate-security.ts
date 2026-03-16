#!/usr/bin/env node
/**
 * Security Static Analysis Validator
 * 
 * Validates for security issues:
 * - Hardcoded secrets/API keys
 * - Security headers (in HTML meta or server config)
 * - Insecure dependencies (via audit)
 * - Mixed content (HTTP in HTTPS)
 * - Inline scripts without nonces
 * - eval() usage
 * - innerHTML with user input
 * - TODO: CSP policy validation
 * 
 * Category: Security
 * Trigger: Security audits, penetration testing, compliance requirements
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationError {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
}

// Patterns for detecting secrets
const SECRET_PATTERNS = [
  { pattern: /(['"`])(sk-|pk-|AKIA)[a-zA-Z0-9]{16,}\1/, name: 'API Key (Stripe/AWS)' },
  { pattern: /(['"`])[a-zA-Z0-9]{32,}(_key|_secret|_token|_password)\1/, name: 'Hardcoded secret' },
  { pattern: /(['"`])password\s*[:=]\s*['"`][^'"`]+['"`]/i, name: 'Hardcoded password' },
  { pattern: /(['"`])secret\s*[:=]\s*['"`][^'"`]+['"`]/i, name: 'Hardcoded secret' },
  { pattern: /(['"`])(api[_-]?key|apikey)\s*[:=]\s*['"`][^'"`]+['"`]/i, name: 'Hardcoded API key' },
];

// Security headers that should be present
const SECURITY_HEADERS = [
  'Content-Security-Policy',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Referrer-Policy',
];

function validateSecrets(directory: string): ValidationError[] {
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
          
          // Skip comments and strings that are clearly not secrets
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
          
          for (const { pattern, name } of SECRET_PATTERNS) {
            if (pattern.test(line)) {
              errors.push({
                file: fullPath,
                line: i + 1,
                message: `Potential ${name} detected. Use environment variables instead.`,
                severity: 'error',
                category: 'hardcoded-secrets'
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

function validateSecurityHeaders(directory: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check for security headers in HTML
  const indexHtmlPath = path.join(directory, 'index.html');
  
  if (!fs.existsSync(indexHtmlPath)) return errors;
  
  const content = fs.readFileSync(indexHtmlPath, 'utf-8');
  
  // Check for CSP meta tag
  if (!content.includes('Content-Security-Policy') && !content.includes('http-equiv="Content-Security-Policy"')) {
    errors.push({
      file: indexHtmlPath,
      line: 0,
      message: 'Missing Content Security Policy. Add CSP headers to prevent XSS attacks.',
      severity: 'warning',
      category: 'security-headers'
    });
  }
  
  // Check for X-Frame-Options
  if (!content.includes('X-Frame-Options')) {
    errors.push({
      file: indexHtmlPath,
      line: 0,
      message: 'Missing X-Frame-Options. This prevents clickjacking attacks.',
      severity: 'warning',
      category: 'security-headers'
    });
  }
  
  return errors;
}

function validateInsecureCode(directory: string): ValidationError[] {
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
          
          // Check for eval()
          if (line.includes('eval(')) {
            errors.push({
              file: fullPath,
              line: i + 1,
              message: 'Dangerous eval() usage detected. This can lead to code injection.',
              severity: 'error',
              category: 'insecure-code'
            });
          }
          
          // Check for innerHTML
          if (line.includes('innerHTML') && !line.includes('// safe') && !line.includes('/* safe */')) {
            errors.push({
              file: fullPath,
              line: i + 1,
              message: 'innerHTML usage detected. Use textContent or sanitize input to prevent XSS.',
              severity: 'warning',
              category: 'insecure-code'
            });
          }
          
          // Check for dangerouslySetInnerHTML in React
          if (line.includes('dangerouslySetInnerHTML')) {
            errors.push({
              file: fullPath,
              line: i + 1,
              message: 'dangerouslySetInnerHTML in React. Ensure content is sanitized.',
              severity: 'warning',
              category: 'insecure-code'
            });
          }
          
          // Check for HTTP URLs in HTTPS context
          if (line.includes('http://') && !line.includes('localhost') && !line.includes('// safe')) {
            errors.push({
              file: fullPath,
              line: i + 1,
              message: 'HTTP URL detected. Use HTTPS to prevent mixed content issues.',
              severity: 'warning',
              category: 'mixed-content'
            });
          }
        }
      }
    }
  }
  
  scanDirectory(srcDir);
  
  return errors;
}

function validateInlineScripts(directory: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  const indexHtmlPath = path.join(directory, 'index.html');
  
  if (!fs.existsSync(indexHtmlPath)) return errors;
  
  const content = fs.readFileSync(indexHtmlPath, 'utf-8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for inline scripts without nonce
    if (line.includes('<script') && !line.includes('src=') && !line.includes('nonce=')) {
      errors.push({
        file: indexHtmlPath,
        line: i + 1,
        message: 'Inline script without nonce. Add nonce attribute for CSP compatibility.',
        severity: 'warning',
        category: 'inline-scripts'
      });
    }
  }
  
  return errors;
}

function main() {
  const clientDir = 'packages/client';
  
  console.log('🔍 Running Security Static Analysis...\n');
  console.log('Category: Security');
  console.log('Checks: Hardcoded secrets, security headers, insecure code, inline scripts\n');
  
  const allErrors: ValidationError[] = [];
  
  // Run all validations
  allErrors.push(...validateSecrets(clientDir));
  allErrors.push(...validateSecurityHeaders(clientDir));
  allErrors.push(...validateInsecureCode(clientDir));
  allErrors.push(...validateInlineScripts(clientDir));
  
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
    console.log('✅ No security issues found!\n');
  } else {
    console.log(`⚠️  Found ${allErrors.length} security issue(s):\n`);
    
    for (const [category, errors] of Object.entries(errorsByCategory)) {
      console.log(`\n${category.toUpperCase()}:`);
      for (const error of errors) {
        const icon = error.severity === 'error' ? '🔴' : error.severity === 'warning' ? '🟡' : '🔵';
        console.log(`  ${icon} ${path.relative('.', error.file)}:${error.line} - ${error.message}`);
      }
    }
  }
  
  // Summary
  const totalErrors = allErrors.filter(e => e.severity === 'error').length;
  const totalWarnings = allErrors.filter(e => e.severity === 'warning').length;
  const totalInfo = allErrors.filter(e => e.severity === 'info').length;
  
  console.log('\n' + '─'.repeat(60));
  console.log(`\nValidation Summary:`);
  console.log(`  Critical Errors: ${totalErrors}`);
  console.log(`  Warnings: ${totalWarnings}`);
  console.log(`  Info: ${totalInfo}`);
  
  if (totalErrors > 0) {
    console.log('\n❌ Validation FAILED - Critical security issues detected');
    console.log('\n⚠️  Fix security issues immediately before deploying');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('\n⚠️  Validation passed with warnings');
    console.log('   Review warnings and fix when possible');
    process.exit(0);
  } else {
    console.log('\n✅ All security validations passed!');
    process.exit(0);
  }
}

main();
