import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { registerAllureMetadata } from '../../../shared/fixtures/allure-helpers';

function registerSecurityMetadata(
  metadata: {
    name?: string;
    ruleReference: string;
    rule: string;
    tags: string[];
  }
) {
  const finalMetadata = {
    ...metadata,
    parentSuite: 'API Verification',
    suite: 'Security',
    feature: 'Security Headers',
  };
  registerAllureMetadata(allure, finalMetadata);
}

/**
 * Security Headers Middleware Verification
 *
 * Verifies that all critical security headers are set on every response.
 * These headers protect against common web vulnerabilities:
 * - MIME type sniffing (X-Content-Type-Options)
 * - Clickjacking (X-Frame-Options)
 * - XSS attacks (X-XSS-Protection)
 * - Protocol downgrade (Strict-Transport-Security)
 * - Content injection (Content-Security-Policy)
 * - Referrer leakage (Referrer-Policy)
 * - Unauthorized feature access (Permissions-Policy)
 * - Sensitive data caching (Cache-Control)
 *
 * @see packages/server/src/server/middleware/security.ts
 * @see OWASP Secure Headers Project
 */
test.describe('Security Headers', () => {
  test.describe('Response Headers Presence', () => {
    test('X-Content-Type-Options is set to nosniff', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'X-Content-Type-Options: nosniff prevents MIME type sniffing',
        tags: ['@security', '@headers'],
        name: 'X-Content-Type-Options header',
      });

      const response = await request.get('/health');

      expect(response.status()).toBe(200);
      expect(response.headers()['x-content-type-options']).toBe('nosniff');
    });

    test('X-Frame-Options is set to DENY', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'X-Frame-Options: DENY prevents clickjacking',
        tags: ['@security', '@headers'],
        name: 'X-Frame-Options header',
      });

      const response = await request.get('/health');

      expect(response.status()).toBe(200);
      expect(response.headers()['x-frame-options']).toBe('DENY');
    });

    test('X-XSS-Protection is set to 1; mode=block', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'X-XSS-Protection: 1; mode=block enables XSS filtering',
        tags: ['@security', '@headers'],
        name: 'X-XSS-Protection header',
      });

      const response = await request.get('/health');

      expect(response.status()).toBe(200);
      expect(response.headers()['x-xss-protection']).toBe('1; mode=block');
    });

    test('Referrer-Policy is set to strict-origin-when-cross-origin', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'Referrer-Policy controls referrer information sent with requests',
        tags: ['@security', '@headers'],
        name: 'Referrer-Policy header',
      });

      const response = await request.get('/health');

      expect(response.status()).toBe(200);
      expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    test('Permissions-Policy restricts browser features', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'Permissions-Policy disables geolocation, camera, microphone by default',
        tags: ['@security', '@headers'],
        name: 'Permissions-Policy header',
      });

      const response = await request.get('/health');

      expect(response.status()).toBe(200);
      const permissionsPolicy = response.headers()['permissions-policy'];
      expect(permissionsPolicy).toBeDefined();
      expect(permissionsPolicy).toContain('geolocation=()');
      expect(permissionsPolicy).toContain('camera=()');
      expect(permissionsPolicy).toContain('microphone=()');
      expect(permissionsPolicy).toContain('payment=(self)');
    });
  });

  test.describe('Content-Security-Policy', () => {
    test('CSP header is present on all responses', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'Content-Security-Policy restricts resource loading sources',
        tags: ['@security', '@csp'],
        name: 'CSP header presence',
      });

      const response = await request.get('/health');

      expect(response.status()).toBe(200);
      expect(response.headers()['content-security-policy']).toBeDefined();
    });

    test('CSP contains default-src self directive', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'CSP default-src self restricts all resources to same origin',
        tags: ['@security', '@csp'],
        name: 'CSP default-src directive',
      });

      const response = await request.get('/health');
      const csp = response.headers()['content-security-policy'];

      expect(csp).toContain("default-src 'self'");
    });

    test('CSP contains script-src directive', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'CSP script-src controls allowed script sources',
        tags: ['@security', '@csp'],
        name: 'CSP script-src directive',
      });

      const response = await request.get('/health');
      const csp = response.headers()['content-security-policy'];

      expect(csp).toContain('script-src');
    });

    test('CSP contains frame-ancestors none directive', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'CSP frame-ancestors none prevents embedding in frames',
        tags: ['@security', '@csp'],
        name: 'CSP frame-ancestors directive',
      });

      const response = await request.get('/health');
      const csp = response.headers()['content-security-policy'];

      expect(csp).toContain("frame-ancestors 'none'");
    });

    test('CSP contains base-uri self directive', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'CSP base-uri self restricts base tag to same origin',
        tags: ['@security', '@csp'],
        name: 'CSP base-uri directive',
      });

      const response = await request.get('/health');
      const csp = response.headers()['content-security-policy'];

      expect(csp).toContain("base-uri 'self'");
    });

    test('CSP is applied on API responses', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'CSP is set on all responses including API endpoints',
        tags: ['@security', '@csp'],
        name: 'CSP on API responses',
      });

      const response = await request.get('/api/products');
      const csp = response.headers()['content-security-policy'];

      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
    });
  });

  test.describe('Cache-Control', () => {
    test('API paths have no-store cache control', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'Cache-Control: no-store prevents caching of sensitive API responses',
        tags: ['@security', '@cache'],
        name: 'API Cache-Control no-store',
      });

      const response = await request.get('/api/products');

      expect(response.status()).toBeDefined();
      const cacheControl = response.headers()['cache-control'];
      expect(cacheControl).toBeDefined();
      expect(cacheControl).toContain('no-store');
    });

    test('Non-API paths do not have cache-control set by middleware', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'Cache-Control is only set for /api paths, not static assets',
        tags: ['@security', '@cache'],
        name: 'Non-API Cache-Control absent',
      });

      const response = await request.get('/health');
      const cacheControl = response.headers()['cache-control'];

      // Middleware only sets Cache-Control for /api paths
      // Non-API paths should not have it set by this middleware
      expect(cacheControl === undefined || !cacheControl.includes('no-store')).toBe(true);
    });
  });

  test.describe('X-Powered-By Removal', () => {
    test('X-Powered-By header is removed', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'X-Powered-By header is removed to prevent technology disclosure',
        tags: ['@security', '@headers'],
        name: 'X-Powered-By removed',
      });

      const response = await request.get('/health');

      expect(response.status()).toBe(200);
      expect(response.headers()['x-powered-by']).toBeUndefined();
    });
  });

  test.describe('CSP Nonce Generator', () => {
    test('generateCspNonce produces valid base64 strings', async () => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'CSP nonce generator produces URL-safe base64 strings',
        tags: ['@security', '@csp'],
        name: 'CSP nonce format',
      });

      const { generateCspNonce } = await import('../../src/server/middleware/security');

      const nonce = generateCspNonce();

      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
      // Should not contain URL-unsafe characters
      expect(nonce).not.toContain('=');
      expect(nonce).not.toContain('+');
      expect(nonce).not.toContain('/');
    });

    test('generateCspNonce produces unique values', async () => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'Each CSP nonce must be unique to prevent replay attacks',
        tags: ['@security', '@csp'],
        name: 'CSP nonce uniqueness',
      });

      const { generateCspNonce } = await import('../../src/server/middleware/security');

      const nonces = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        nonces.add(generateCspNonce());
      }

      expect(nonces.size).toBe(iterations);
    });
  });

  test.describe('Headers on All Endpoints', () => {
    test('security headers present on POST endpoint', async ({ request }) => {
      registerSecurityMetadata({
        ruleReference: 'security-headers-middleware',
        rule: 'Security headers are set on all HTTP methods, not just GET',
        tags: ['@security', '@headers'],
        name: 'Headers on POST',
      });

      const response = await request.post('/api/pricing/calculate', {
        data: {
          items: [],
          user: { tenureYears: 0 },
          method: 'STANDARD',
        },
      });

      expect(response.headers()['x-content-type-options']).toBe('nosniff');
      expect(response.headers()['x-frame-options']).toBe('DENY');
      expect(response.headers()['content-security-policy']).toBeDefined();
    });


  });
});
