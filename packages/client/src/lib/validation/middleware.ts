/**
 * Zod Validation Middleware for Hono
 *
 * Provides request validation using Zod schemas at API boundaries.
 * Validates request body, query params, and path params.
 *
 * ZOD-FIRST ARCHITECTURE:
 * - Zod schemas are the single source of truth for all runtime validation
 * - TypeScript types derive from schemas via z.infer<>
 * - Validation happens before route handlers, ensuring clean code
 *
 * @see PRODUCTION_READY_PLAN.md Part 5.1: Comprehensive Zod Validation Pipeline
 */

import { z, ZodError } from 'zod';
import type { ZodType } from 'zod';
import type { Context, Next } from 'hono';
import { ValidationError } from '../errors';
import { logger } from '../logger';

/**
 * Hono Context extension keys for validated data
 */
export const VALIDATED_BODY_KEY = 'validatedBody' as const;
export const VALIDATED_PARAMS_KEY = 'validatedParams' as const;
export const VALIDATED_QUERY_KEY = 'validatedQuery' as const;

/**
 * Validation options
 */
export interface ValidationOptions {
  /**
   * Custom error message for validation failures
   */
  userMessage?: string;

  /**
   * Include raw input in error response (development only)
   */
  includeInput?: boolean;
}

/**
 * Middleware to validate request body
 *
 * @param schema - Zod schema to validate against
 * @param options - Validation options
 *
 * @example
 * router.post('/users', validateBody(createUserSchema), async (c) => {
 *   const user = c.get('validatedBody'); // Type-safe validated data
 *   return c.json({ id: user.id });
 * });
 */
export function validateBody<T extends ZodType<unknown>>(
  schema: T,
  options: ValidationOptions = {}
) {
  return async (c: Context, next: Next) => {
    const actionLogger = logger.withRequest(c.get('requestId'));

    try {
      const rawBody = await c.req.raw.clone().text();

      // Handle empty body
      if (!rawBody.trim()) {
        throw new ValidationError('Request body is empty', {
          _body: ['Request body is required'],
        });
      }

      let body: unknown;

      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        throw new ValidationError('Invalid JSON in request body', {
          _body: ['Request body must be valid JSON'],
        }, e as Error, 'Invalid request format');
      }

      const validated = schema.parse(body);

      // Set validated body in context for route handlers
      c.set('validatedBody', validated);
      c.set('rawBody', body);

      actionLogger.debug('Request body validated', {
        action: 'validate_body',
        schema: schema.constructor.name,
      });

      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = ValidationError.fromZod(error, options.userMessage);
        actionLogger.warn('Body validation failed', {
          action: 'validate_body',
          fields: validationError.fields,
        });
        return c.json(validationError.toResponse(), 400);
      }

      // Re-throw ValidationError as-is
      if (error instanceof ValidationError) {
        actionLogger.warn('Body validation failed', {
          action: 'validate_body',
          fields: error.fields,
        });
        return c.json(error.toResponse(), 400);
      }

      // Unknown error
      actionLogger.error('Unexpected validation error', error, {
        action: 'validate_body',
      });
      throw error;
    }
  };
}

/**
 * Middleware to validate query parameters
 *
 * @param schema - Zod schema to validate against
 * @param options - Validation options
 *
 * @example
 * router.get('/users', validateQuery(listUsersQuerySchema), async (c) => {
 *   const { page, limit } = c.get('validatedQuery'); // Type-safe validated data
 *   return c.json({ users });
 * });
 */
export function validateQuery<T extends ZodType<unknown>>(
  schema: T,
  options: ValidationOptions = {}
) {
  return async (c: Context, next: Next) => {
    const actionLogger = logger.withRequest(c.get('requestId'));

    try {
      // Get query params from URL
      const queryParams: Record<string, string | string[] | undefined> = {};

      // Hono's query() method returns URLSearchParams-like object
      const url = new URL(c.req.url);
      url.searchParams.forEach((value, key) => {
        // Handle arrays (e.g., ?tags=foo&tags=bar)
        if (queryParams[key]) {
          if (Array.isArray(queryParams[key])) {
            (queryParams[key] as string[]).push(value);
          } else {
            queryParams[key] = [queryParams[key] as string, value];
          }
        } else {
          queryParams[key] = value;
        }
      });

      const validated = schema.parse(queryParams);

      // Set validated query in context
      c.set('validatedQuery', validated);
      c.set('rawQuery', queryParams);

      actionLogger.debug('Query params validated', {
        action: 'validate_query',
        schema: schema.constructor.name,
      });

      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = ValidationError.fromZod(error, options.userMessage);
        actionLogger.warn('Query validation failed', {
          action: 'validate_query',
          fields: validationError.fields,
        });
        return c.json(validationError.toResponse(), 400);
      }

      if (error instanceof ValidationError) {
        actionLogger.warn('Query validation failed', {
          action: 'validate_query',
          fields: error.fields,
        });
        return c.json(error.toResponse(), 400);
      }

      actionLogger.error('Unexpected validation error', error, {
        action: 'validate_query',
      });
      throw error;
    }
  };
}

/**
 * Middleware to validate path parameters
 *
 * @param schema - Zod schema to validate against
 * @param options - Validation options
 *
 * @example
 * router.get('/users/:id', validateParams({ id: z.string().uuid() }), async (c) => {
 *   const { id } = c.get('validatedParams'); // Type-safe validated data
 *   return c.json({ user: await getUserById(id) });
 * });
 */
export function validateParams<T extends ZodType<unknown>>(
  schema: T,
  options: ValidationOptions = {}
) {
  return async (c: Context, next: Next) => {
    const actionLogger = logger.withRequest(c.get('requestId'));

    try {
      // Get params from context
      const params = c.req.param();

      const validated = schema.parse(params);

      // Set validated params in context
      c.set('validatedParams', validated);
      c.set('rawParams', params);

      actionLogger.debug('Path params validated', {
        action: 'validate_params',
        schema: schema.constructor.name,
      });

      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = ValidationError.fromZod(error, options.userMessage);
        actionLogger.warn('Path params validation failed', {
          action: 'validate_params',
          fields: validationError.fields,
        });
        return c.json(validationError.toResponse(), 400);
      }

      if (error instanceof ValidationError) {
        actionLogger.warn('Path params validation failed', {
          action: 'validate_params',
          fields: error.fields,
        });
        return c.json(error.toResponse(), 400);
      }

      actionLogger.error('Unexpected validation error', error, {
        action: 'validate_params',
      });
      throw error;
    }
  };
}

/**
 * Validate both body and query params
 *
 * @param bodySchema - Zod schema for body validation
 * @param querySchema - Zod schema for query validation
 * @param options - Validation options
 */
export function validateAll<T extends ZodType<unknown>, U extends ZodType<unknown>>(
  bodySchema: T,
  querySchema: U,
  options: ValidationOptions = {}
) {
  return [validateBody(bodySchema, options), validateQuery(querySchema, options)];
}

/**
 * Type helper to extract validated body type
 */
export type ValidatedBody<T extends ZodType<unknown>> = z.infer<T>;

/**
 * Type helper to extract validated query type
 */
export type ValidatedQuery<T extends ZodType<unknown>> = z.infer<T>;

/**
 * Type helper to extract validated params type
 */
export type ValidatedParams<T extends ZodType<unknown>> = z.infer<T>;
