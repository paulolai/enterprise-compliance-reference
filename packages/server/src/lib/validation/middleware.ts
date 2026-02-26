import type { Context, Next } from 'hono';
import { z } from 'zod';

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    if (!schema) {
      console.error('validateBody: Schema is undefined');
      return c.json({ error: 'SERVER_ERROR', message: 'Internal validation error' }, 500);
    }

    try {
      const body = await c.req.json();
      const result = schema.safeParse(body);
      
      if (!result.success) {
        const fields: Record<string, string[]> = {};
        result.error.issues.forEach((issue) => {
          const path = issue.path.join('.') || 'root';
          if (!fields[path]) {
            fields[path] = [];
          }
          fields[path].push(issue.message);
        });

        return c.json({
          error: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          statusCode: 400,
          fields
        }, 400);
      }
      
      c.set('validatedBody', result.data);
      await next();
    } catch (error) {
      // Handle non-Zod errors (like JSON parsing)
      return c.json({ 
        error: 'VALIDATION_ERROR', 
        message: 'Invalid request body or JSON format', 
        statusCode: 400,
        fields: { root: ['Invalid JSON format or missing fields'] }
      }, 400);
    }
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    if (!schema) {
      console.error('validateParams: Schema is undefined');
      return c.json({ error: 'SERVER_ERROR', message: 'Internal validation error' }, 500);
    }

    const params = c.req.param();
    const result = schema.safeParse(params);
    
    if (!result.success) {
      return c.json({
        error: 'VALIDATION_ERROR',
        message: 'URL parameter validation failed',
        statusCode: 400,
        details: result.error.format()
      }, 400);
    }
    
    c.set('validatedParams', result.data);
    await next();
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    if (!schema) {
      console.error('validateQuery: Schema is undefined');
      return c.json({ error: 'SERVER_ERROR', message: 'Internal validation error' }, 500);
    }

    const query = c.req.query();
    const result = schema.safeParse(query);
    
    if (!result.success) {
      return c.json({
        error: 'VALIDATION_ERROR',
        message: 'Query parameter validation failed',
        statusCode: 400,
        details: result.error.format()
      }, 400);
    }
    
    c.set('validatedQuery', result.data);
    await next();
  };
}
