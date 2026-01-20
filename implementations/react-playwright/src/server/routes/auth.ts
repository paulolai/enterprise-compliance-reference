import { Hono } from 'hono';

// Mock user database
const USERS = new Map([
  ['vip@techhome.com', { name: 'VIP Customer', tenureYears: 4, email: 'vip@techhome.com' }],
  ['goldmember@store.com', { name: 'Gold Member', tenureYears: 5, email: 'goldmember@store.com' }],
  ['new@customer.com', { name: 'New Customer', tenureYears: 0, email: 'new@customer.com' }],
  ['regular@shopper.com', { name: 'Regular Shopper', tenureYears: 1, email: 'regular@shopper.com' }],
]);

const router = new Hono();

router.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    const user = USERS.get(email);
    if (user && password === 'password') {
      // Return user without password and with a mock access token
      const { password: _, ...userWithoutPassword } = user as any;
      return c.json({
        user: userWithoutPassword,
        accessToken: 'mock-token-' + Math.random().toString(36).substr(2),
      });
    }

    return c.json({ error: 'Invalid credentials' }, 401);
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ error: 'Login failed' }, 400);
  }
});

router.post('/register', async (c) => {
  try {
    const { email, name, password } = await c.req.json();

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
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 400);
  }
});

export { router as authRouter };
