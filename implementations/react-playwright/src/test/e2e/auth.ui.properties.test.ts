import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { invariant } from './fixtures/invariant-helper';

invariant('Invariant: Login page renders correctly', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'Login page structure verification',
  tags: []
}, async ({ page }) => {
  await page.goto('/login');

  // Check for login form elements
  await expect(page.getByTestId('email-input')).toBeVisible();
  await expect(page.getByTestId('password-input')).toBeVisible();
  await expect(page.getByTestId('login-button')).toBeVisible();
});

invariant('Invariant: Demo user buttons work', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'Demo functionality for testing',
  tags: ['@demo']
}, async ({ page }) => {
  await page.goto('/login');

  // Click VIP demo user
  await page.getByTestId('demo-vip').click();

  // Email should be filled
  const emailInput = page.getByTestId('email-input');
  await expect(emailInput).toHaveValue('vip@techhome.com');
});

invariant('Invariant: Register page renders correctly', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'Register page structure verification',
  tags: []
}, async ({ page }) => {
  await page.goto('/register');

  // Check for register form elements
  await expect(page.getByTestId('register-name')).toBeVisible();
  await expect(page.getByTestId('register-email')).toBeVisible();
  await expect(page.getByTestId('register-password')).toBeVisible();
  await expect(page.getByTestId('register-button')).toBeVisible();
});

invariant('Invariant: Login with valid credentials succeeds', {
  ruleReference: 'pricing-strategy.md §3 - VIP Tier',
  rule: 'Valid login grants access and loads user state (VIP status)',
  tags: ['@vip']
}, async ({ page }) => {
  await page.goto('/login');

  // Fill in login form with demo VIP user
  await page.getByTestId('email-input').fill('vip@techhome.com');
  await page.getByTestId('password-input').fill('password');
  await page.getByTestId('login-button').click();

  // Should navigate to cart after successful login
  await page.waitForURL(/\/cart/);

  // VIP badge should be visible in cart
  await expect(page.getByTestId('vip-badge')).toBeVisible();
});

invariant('Invariant: Login with invalid credentials shows error', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'System rejects invalid authentication',
  tags: ['@security']
}, async ({ page }) => {
  await page.goto('/login');

  // Fill in login form with invalid credentials
  await page.getByTestId('email-input').fill('invalid@example.com');
  await page.getByTestId('password-input').fill('wrongpassword');
  await page.getByTestId('login-button').click();

  // Error message should be shown
  await expect(page.getByText(/Invalid credentials/)).toBeVisible();
});

invariant('Invariant: Registration with new email succeeds', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'New user registration flow',
  tags: []
}, async ({ page }) => {
  const uniqueEmail = `newuser${Date.now()}@example.com`;

  await page.goto('/register');

  // Fill in registration form
  await page.getByTestId('register-name').fill('New User');
  await page.getByTestId('register-email').fill(uniqueEmail);
  await page.getByTestId('register-password').fill('password');
  await page.getByTestId('register-button').click();

  // Should navigate to cart after successful registration
  await page.waitForURL(/\/cart/);

  // Should be on cart page with empty cart
  await expect(page.getByText('Your cart is empty')).toBeVisible();
});
