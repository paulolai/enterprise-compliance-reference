import { Hono } from 'hono';
import { logger } from '../../lib/logger';
import { validateBody } from '../../lib/validation/middleware';
import { requestSchemas } from '../../lib/validation/schemas';

/**
 * Mock Authentication Routes
 *
 * DEMO ONLY: This is a mock authentication system for demonstration purposes.
 * In production, replace this with real authentication using proper password
 * hashing, JWT tokens, and a secure user database.
 */

// Mock user database
const USERS = new Map([
  ['vip@techhome.com', { name: 'VIP Customer', tenureYears: 4, email: 'vip@techhome.com' }],
  ['goldmember@store.com', { name: 'Gold Member', tenureYears: 5, email: 'goldmember@store.com' }],
  ['new@customer.com', { name: 'New Customer', tenureYears: 0, email: 'new@customer.com' }],
  ['regular@shopper.com', { name: 'Regular Shopper', tenureYears: 1, email: 'regular@shopper.com' }],
]);

const router = new Hono();

router.post('/login', validateBody(requestSchemas.login), async (c) => {
  try {
    const { email, password } = c.get('validatedBody');

    const user = USERS.get(email);
    if (user && password === 'password') {
      // Return user without password and with a mock access token
      const { email: userEmail, name, tenureYears } = user;
      const userWithoutPassword = { email: userEmail, name, tenureYears };
      return c.json({
        user: userWithoutPassword,
        accessToken: 'mock-token-' + Math.random().toString(36).substr(2),
      });
    }

    return c.json({ error: 'Invalid credentials' }, 401);
  } catch (error) {
    logger.error('Auth error', error, { action: 'login' });
    return c.json({ error: 'Login failed' }, 400);
  }
});

router.post('/register', async (c) => {
  try {
    // Note: register schema not yet in centralized schemas, using manual for now or add it
    const { email, name } = await c.req.json();

    // Check if user already exists
    if (USERS.has(email)) {
      return c.json({ error: 'User already exists' }, 400);
    }

    // Create new user with 0 tenure
    const newUser = {
      name,
      tenureYears: 0,
      email,
    };
    USERS.set(email, newUser);

    return c.json({
      user: newUser,
      accessToken: 'mock-token-' + Math.random().toString(36).substr(2),
    });
  } catch (error) {
    logger.error('Registration failed', error, { action: 'register' });
    return c.json({ error: 'Registration failed' }, 400);
  }
});

export { router as authRouter };
