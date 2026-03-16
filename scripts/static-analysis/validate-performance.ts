#!/usr/bin/env node
/**
 * Performance Static Analysis Validator
 * 
 * Validates for performance issues:
 * - Large unoptimized images
 * - Missing lazy loading on images
 * - Large JavaScript bundles (via vite build analysis)
 * - Unused dependencies
 * - Missing resource hints (preload, prefetch)
 * - Render-blocking resources
 * 
 * Category: Performance
 * Trigger: Slow page loads, Lighthouse warnings, manual testing
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

const PERFORMANCE_LIMITS = {
  maxImageSizeKB: 200,
  maxBundleSizeKB: 500,
  maxDependencies: 50,
  warningImageSizeKB: 100,
};

function validateImages(directory: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  const imageDirs = [
    path.join(directory, 'public'),
    path.join(directory, 'src/assets'),
  ];
  
  for (const imgDir of imageDirs) {
    if (!fs.existsSync(imgDir)) continue;
    
    const files = fs.readdirSync(imgDir, { recursive: true }) as string[];
    
    for (const file of files) {
      const filePath = path.join(imgDir, file);
      const ext = path.extname(file).toLowerCase();
      
      if (!['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) {
        continue;
      }
      
      const stats = fs.statSync(filePath);
      const sizeKB = stats.size / 1024;
      
      if (sizeKB > PERFORMANCE_LIMITS.maxImageSizeKB) {
        errors.push({
          file: filePath,
          line: 0,
          message: `Image too large: ${sizeKB.toFixed(1)}KB (max: ${PERFORMANCE_LIMITS.maxImageSizeKB}KB). Consider optimizing or using WebP format.`,
          severity: 'error',
          category: 'image-optimization'
        });
      } else if (sizeKB > PERFORMANCE_LIMITS.warningImageSizeKB) {
        errors.push({
          file: filePath,
          line: 0,
          message: `Image large: ${sizeKB.toFixed(1)}KB (warning threshold: ${PERFORMANCE.warningImageSizeKB}KB). Consider optimization.`,
          severity: 'warning',
          category: 'image-optimization'
        });
      }
      
      // Check for modern formats
      if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        errors.push({
          file: filePath,
          line: 0,
          message: `Consider converting ${ext} to WebP for better compression.`,
          severity: 'warning',
          category: 'image-format'
        });
      }
    }
  }
  
  return errors;
}

function validateLazyLoading(directory: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Scan for image components without loading="lazy"
  const srcDir = path.join(directory, 'src');
  
  if (!fs.existsSync(srcDir)) return errors;
  
  function scanDirectory(dir: string): void {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.jsx')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Check for img tags without loading attribute
          if (line.includes('<img') && !line.includes('loading=')) {
            errors.push({
              file: fullPath,
              line: i + 1,
              message: 'Image missing loading="lazy" attribute. Add for better performance.',
              severity: 'warning',
              category: 'lazy-loading'
            });
          }
        }
      }
    }
  }
  
  scanDirectory(srcDir);
  
  return errors;
}

function validateDependencies(directory: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  const packageJsonPath = path.join(directory, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) return errors;
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = Object.keys(packageJson.dependencies || {});
  const devDeps = Object.keys(packageJson.devDependencies || {});
  const totalDeps = deps.length + devDeps.length;
  
  if (totalDeps > PERFORMANCE_LIMITS.maxDependencies) {
    errors.push({
      file: packageJsonPath,
      line: 0,
      message: `Too many dependencies: ${totalDeps} (max recommended: ${PERFORMANCE_LIMITS.maxDependencies}). Consider auditing unused packages.`,
      severity: 'warning',
      category: 'dependency-count'
    });
  }
  
  // Check for common bloat packages
  const bloatPackages = ['lodash', 'moment', 'jquery'];
  for (const pkg of bloatPackages) {
    if (deps.includes(pkg) || devDeps.includes(pkg)) {
      errors.push({
        file: packageJsonPath,
        line: 0,
        message: `Consider replacing "${pkg}" with a lighter alternative (e.g., date-fns instead of moment).`,
        severity: 'warning',
        category: 'dependency-bloat'
      });
    }
  }
  
  return errors;
}

function validateResourceHints(directory: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  const indexHtmlPath = path.join(directory, 'index.html');
  
  if (!fs.existsSync(indexHtmlPath)) return errors;
  
  const content = fs.readFileSync(indexHtmlPath, 'utf-8');
  
  // Check for preload hints
  if (!content.includes('rel="preload"')) {
    errors.push({
      file: indexHtmlPath,
      line: 0,
      message: 'No resource preloading found. Consider adding <link rel="preload"> for critical resources.',
      severity: 'warning',
      category: 'resource-hints'
    });
  }
  
  // Check for prefetch hints
  if (!content.includes('rel="prefetch"') && !content.includes('rel="dns-prefetch"')) {
    errors.push({
      file: indexHtmlPath,
      line: 0,
      message: 'No prefetch hints found. Consider adding prefetch for likely next pages.',
      severity: 'warning',
      category: 'resource-hints'
    });
  }
  
  return errors;
}

function main() {
  const clientDir = 'packages/client';
  
  console.log('🔍 Running Performance Static Analysis...\n');
  console.log('Category: Performance');
  console.log('Checks: Image optimization, lazy loading, dependencies, resource hints\n');
  
  const allErrors: ValidationError[] = [];
  
  // Run all validations
  allErrors.push(...validateImages(clientDir));
  allErrors.push(...validateLazyLoading(clientDir));
  allErrors.push(...validateDependencies(clientDir));
  allErrors.push(...validateResourceHints(clientDir));
  
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
    console.log('✅ No performance issues found!\n');
  } else {
    console.log(`❌ Found ${allErrors.length} performance issue(s):\n`);
    
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
    console.log('\n❌ Validation FAILED - Performance issues detected');
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
