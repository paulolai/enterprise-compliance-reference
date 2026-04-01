import { expect } from '@playwright/test';
import { invariant } from './fixtures/invariant-helper';

invariant('Login form blocks submission with invalid email format', {
  ruleReference: 'pricing-strategy.md §6.1 - Login Form Validation',
  rule: 'Email must match valid email format (contains @ and domain)',
  tags: ['@auth', '@validation', '@login']
}, async ({ page }) => {
  await page.goto('/login');

  // Enter invalid email format
  await page.getByLabel('Email').fill('invalid-email');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Should still be on login page (validation prevented submission)
  await expect(page.getByTestId('login-page')).toBeVisible();

  // Should show validation error for email
  await expect(page.getByText(/Please enter a valid email address/i)).toBeVisible();
});

invariant('Login form blocks submission with short password', {
  ruleReference: 'pricing-strategy.md §6.1 - Login Form Validation',
  rule: 'Password must be at least 6 characters',
  tags: ['@auth', '@validation', '@login']
}, async ({ page }) => {
  await page.goto('/login');

  // Enter valid email but short password
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('short');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Should still be on login page (validation prevented submission)
  await expect(page.getByTestId('login-page')).toBeVisible();

  // Should show validation error for password
  await expect(page.getByText(/Password must be at least 6 characters/i)).toBeVisible();
});

invariant('Login form allows submission with valid credentials', {
  ruleReference: 'pricing-strategy.md §6.1 - Login Form Validation',
  rule: 'Form submission proceeds when all validation passes',
  tags: ['@auth', '@validation', '@login']
}, async ({ page }) => {
  await page.goto('/login');

  // Enter valid credentials
  await page.getByLabel('Email').fill('vip@techhome.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Should navigate to cart after successful login
  await page.waitForURL(/\/cart/, { timeout: 5000 });
  await expect(page.getByTestId('cart-page')).toBeVisible();
});

invariant('Registration form blocks submission with short name', {
  ruleReference: 'pricing-strategy.md §6.2 - Registration Form Validation',
  rule: 'Name must be at least 2 characters',
  tags: ['@auth', '@validation', '@registration']
}, async ({ page }) => {
  await page.goto('/register');

  // Enter short name
  await page.getByLabel('Name').fill('A');
  await page.getByLabel('Email').fill('newuser@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create Account' }).click();

  // Should still be on register page (validation prevented submission)
  await expect(page.getByTestId('register-page')).toBeVisible();

  // Should show validation error for name
  await expect(page.getByText(/Name must be at least 2 characters/i)).toBeVisible();
});

invariant('Registration form blocks submission with invalid email format', {
  ruleReference: 'pricing-strategy.md §6.2 - Registration Form Validation',
  rule: 'Email must match valid email format',
  tags: ['@auth', '@validation', '@registration']
}, async ({ page }) => {
  await page.goto('/register');

  // Enter invalid email format
  await page.getByLabel('Name').fill('John Doe');
  await page.getByLabel('Email').fill('invalid-email');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create Account' }).click();

  // Should still be on register page (validation prevented submission)
  await expect(page.getByTestId('register-page')).toBeVisible();

  // Should show validation error for email
  await expect(page.getByText(/Please enter a valid email address/i)).toBeVisible();
});

invariant('Registration form blocks submission with weak password', {
  ruleReference: 'pricing-strategy.md §6.2 - Registration Form Validation',
  rule: 'Password must be at least 8 characters with at least one letter and one number',
  tags: ['@auth', '@validation', '@registration']
}, async ({ page }) => {
  await page.goto('/register');

  // Enter weak password (no number)
  await page.getByLabel('Name').fill('John Doe');
  await page.getByLabel('Email').fill('newuser@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Create Account' }).click();

  // Should still be on register page (validation prevented submission)
  await expect(page.getByTestId('register-page')).toBeVisible();

  // Should show validation error for password (missing number)
  await expect(page.getByText(/Password must contain at least one letter and one number/i)).toBeVisible();
});

invariant('Registration form blocks submission with short password', {
  ruleReference: 'pricing-strategy.md §6.2 - Registration Form Validation',
  rule: 'Password must be at least 8 characters',
  tags: ['@auth', '@validation', '@registration']
}, async ({ page }) => {
  await page.goto('/register');

  // Enter short password
  await page.getByLabel('Name').fill('John Doe');
  await page.getByLabel('Email').fill('newuser@example.com');
  await page.getByLabel('Password').fill('pass1');
  await page.getByRole('button', { name: 'Create Account' }).click();

  // Should still be on register page (validation prevented submission)
  await expect(page.getByTestId('register-page')).toBeVisible();

  // Should show validation error for password
  await expect(page.getByText(/Password must be at least 8 characters/i)).toBeVisible();
});

invariant('Registration form allows submission with valid data', {
  ruleReference: 'pricing-strategy.md §6.2 - Registration Form Validation',
  rule: 'Form submission proceeds when all validation passes',
  tags: ['@auth', '@validation', '@registration']
}, async ({ page }) => {
  const uniqueEmail = `testuser${Date.now()}@example.com`;

  await page.goto('/register');

  // Enter valid registration data
  await page.getByLabel('Name').fill('John Doe');
  await page.getByLabel('Email').fill(uniqueEmail);
  await page.getByLabel('Password').fill('SecurePass123');
  await page.getByRole('button', { name: 'Create Account' }).click();

  // Should navigate to cart after successful registration
  await page.waitForURL(/\/cart/, { timeout: 5000 });
  await expect(page.getByTestId('cart-page')).toBeVisible();
});

invariant('Validation errors clear when user corrects input', {
  ruleReference: 'pricing-strategy.md §6.1-6.2 - Form Validation',
  rule: 'Validation errors disappear when invalid fields are corrected',
  tags: ['@auth', '@validation', '@ux']
}, async ({ page }) => {
  await page.goto('/login');

  // Trigger validation error
  await page.getByLabel('Email').fill('invalid');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Error should be visible
  await expect(page.getByText(/Please enter a valid email address/i)).toBeVisible();

  // Correct the email
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password');

  // Error should disappear (either on blur or on type)
  await page.waitForTimeout(300);
  await expect(page.getByText(/Please enter a valid email address/i)).not.toBeVisible();
});
