import type { MiddlewareHandler } from 'hono';
import { isDevelopment, isProduction } from '../../lib/env';

/**
 * Security Headers Middleware
 *
 * Sets comprehensive security headers on all responses to protect against
 * common web vulnerabilities:
 *
 * - X-Content-Type-Options: nosniff - Prevents MIME type sniffing
 * - X-Frame-Options: DENY - Prevents clickjacking
 * - X-XSS-Protection: 1; mode=block - Enables XSS filtering
 * - Strict-Transport-Security: Enforces HTTPS in production
 * - Content-Security-Policy: Restricts resource loading sources
 *
 * The CSP is relaxed in development to support hot-reloading and
 * debugging tools, but strict in production.
 *
 * @see OWASP Secure Headers Project: https://owasp.org/www-project-secure-headers/
 */
export const securityHeaders = (): MiddlewareHandler => {
  return async (c, next) => {
    await next();

    const headers = c.res.headers;

    // X-Content-Type-Options: Prevents MIME type sniffing
    // This stops the browser from interpreting files as a different MIME type
    headers.set('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options: Prevents clickjacking by blocking embedding
    // DENY means the page cannot be framed by anyone
    headers.set('X-Frame-Options', 'DENY');

    // X-XSS-Protection: Enables the browser's XSS filter
    // mode=block ensures the response is not served if an attack is detected
    headers.set('X-XSS-Protection', '1; mode=block');

    // Strict-Transport-Security: Enforces HTTPS in production
    // max-age=31536000 tells browsers to remember for 1 year
    // includeSubDomains applies the rule to all subdomains
    if (isProduction) {
      headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Content-Security-Policy: Defines allowed sources for content
    // Using a restrictive default with specific allow-lists
    const csp = isDevelopment
      ? // Relaxed CSP for development (allows inline scripts, eval, etc.)
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:*",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')
      : // Strict CSP for production
        [
          "default-src 'self'",
          "script-src 'self' 'nonce-{nonce}'",
          "style-src 'self' 'nonce-{nonce}'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://*.stripe.com https://js.stripe.com",
          "frame-src https://js.stripe.com https://hooks.stripe.com",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "require-trusted-types-for 'script'",
        ].join('; ');

    headers.set('Content-Security-Policy', csp);

    // Referrer-Policy: Controls how much referrer info is sent
    // strict-origin-when-cross-origin: Full URL for same-origin, origin for cross-origin
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions-Policy: Controls which browser features can be used
    // Disables geolocation, camera, microphone by default
    const permissionsPolicy = [
      'geolocation=()',
      'camera=()',
      'microphone=()',
      'payment=(self)',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', ');
    headers.set('Permissions-Policy', permissionsPolicy);

    // Cache-Control: Prevent caching of sensitive responses
    // Only for API responses (not static assets handled by the dev server)
    if (c.req.path.startsWith('/api')) {
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }

    // Remove X-Powered-By header that Express/Hono adds
    headers.delete('X-Powered-By');
  };
};

/**
 * CSP Nonce Generator
 *
 * Generates a random nonce for inline scripts in production.
 * The nonce is echoed into the HTML template for each request.
 */
export const generateCspNonce = (): string => {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16)))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};
