import { expect } from '@playwright/test';
import { invariant } from './fixtures/invariant-helper';

invariant('Login page renders correctly', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'Login page structure verification',
  tags: []
}, async ({ page }) => {
  await page.goto('/login');

  // Check for login form elements
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});

invariant('Demo user buttons work', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'Demo functionality for testing',
  tags: ['@demo']
}, async ({ page }) => {
  await page.goto('/login');

  // Click VIP demo user
  await page.getByRole('button', { name: 'VIP User' }).click();

  // Email should be filled
  const emailInput = page.getByLabel('Email');
  await expect(emailInput).toHaveValue('vip@techhome.com');
});

invariant('Register page renders correctly', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'Register page structure verification',
  tags: []
}, async ({ page }) => {
  await page.goto('/register');

  // Check for register form elements
  await expect(page.getByLabel('Name')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
});

invariant('Login with valid credentials succeeds', {
  ruleReference: 'pricing-strategy.md §3 - VIP Tier',
  rule: 'Valid login grants access and loads user state (VIP status)',
  tags: ['@vip']
}, async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill in login form with demo VIP user
  await page.getByLabel('Email').fill('vip@techhome.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Should navigate to cart after successful login
  await page.waitForURL(/\/cart/, { timeout: 5000 });

  // VIP badge should be visible in cart
  await expect(page.getByTestId('vip-user-label')).toBeVisible();
});

invariant('Login with invalid credentials shows error', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'System rejects invalid authentication',
  tags: ['@security']
}, async ({ page }) => {
  await page.goto('/login');

  // Fill in login form with invalid credentials
  await page.getByLabel('Email').fill('invalid@example.com');
  await page.getByLabel('Password').fill('wrongpassword');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Error message should be shown
  await expect(page.getByText(/Invalid credentials/)).toBeVisible();
});

invariant('Registration with new email succeeds', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'New user registration flow',
  tags: []
}, async ({ page }) => {
  const uniqueEmail = `newuser${Date.now()}@example.com`;

  await page.goto('/register');

  // Fill in registration form
  await page.getByLabel('Name').fill('New User');
  await page.getByLabel('Email').fill(uniqueEmail);
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Create Account' }).click();

  // Should navigate to cart after successful registration
  await page.waitForURL(/\/cart/);

  // Should be on cart page with empty cart
  await expect(page.getByText('Your cart is empty')).toBeVisible();
});
