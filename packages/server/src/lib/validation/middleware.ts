import type { Context, Next } from 'hono';
import { z } from 'zod';

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const result = schema.parse(body);
      c.set('validatedBody', result);
      await next();
    } catch (error) {
      return c.json({ error: 'Validation failed', details: error }, 400);
    }
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const params = c.req.param();
      const result = schema.parse(params);
      c.set('validatedParams', result);
      await next();
    } catch (error) {
      return c.json({ error: 'Validation failed', details: error }, 400);
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query();
      const result = schema.parse(query);
      c.set('validatedQuery', result);
      await next();
    } catch (error) {
      return c.json({ error: 'Validation failed', details: error }, 400);
    }
  };
}
