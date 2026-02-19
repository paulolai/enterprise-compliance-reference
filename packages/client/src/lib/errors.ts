/**
 * Error Handling Architecture
 *
 * Provides a structured error hierarchy for consistent error handling
 * across the application. All errors extend from AppError with
 * standardized codes and HTTP status codes.
 *
 * ZOD-FIRST ARCHITECTURE:
 * - Zod validation errors are wrapped in ValidationError
 * - Type-safe error codes prevent typos in error handling
 *
 * @see ADR-10: Result Pattern for Error Handling
 * @see PRODUCTION_READY_PLAN.md Part 2.2: Error Handling Architecture
 */

import type { ZodError } from 'zod';

/**
 * Standard error codes for categorizing errors
 * Each code maps to a specific type of failure for client handling.
 */
export enum ErrorCode {
  // Validation errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELD = 'MISSING_FIELD',

  // Authentication/Authorization (4xx)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // Not found (4xx)
  NOT_FOUND = 'NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',

  // Business logic errors (4xx)
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_STATE = 'INVALID_STATE',

  // Rate limiting (4xx)
  RATE_LIMITED = 'RATE_LIMITED',

  // External service errors (5xx)
  STRIPE_ERROR = 'STRIPE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Internal errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Mapping of error codes to HTTP status codes
 */
export const ERROR_CODE_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_FIELD]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.PRODUCT_NOT_FOUND]: 404,
  [ErrorCode.ORDER_NOT_FOUND]: 404,
  [ErrorCode.PAYMENT_FAILED]: 402,
  [ErrorCode.PAYMENT_REQUIRED]: 402,
  [ErrorCode.INSUFFICIENT_STOCK]: 400,
  [ErrorCode.INVALID_STATE]: 400,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.STRIPE_ERROR]: 502,
  [ErrorCode.DATABASE_ERROR]: 503,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
};

/**
 * Base application error class
 *
 * All custom errors extend from this class to provide:
 * - Standardized error codes for client handling
 * - HTTP status codes for proper API responses
 * - Optional cause chain for debugging
 * - Optional user-facing messages
 */
export class AppError extends Error {
  /**
   * Create a new application error
   *
   * @param message - Developer-facing error message (logged, not sent to client)
   * @param code - Standardized error code for client handling
   * @param statusCode - HTTP status code for API responses
   * @param cause - Original error that caused this error (for debugging)
   * @param userMessage - Optional user-friendly message (safely shown to users)
   */
  constructor(
    message: string,
    public code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    public statusCode: number = ERROR_CODE_STATUS[code],
    public cause?: unknown,
    public userMessage?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * Convert to API response payload
   *
   * Formats the error for sending to clients in API responses.
   * Sensitive information (message, cause) is not included in production.
   */
  toResponse(): ErrorResponse {
    return {
      error: this.code,
      message: this.userMessage || this.getDefaultUserMessageValue(),
      statusCode: this.statusCode,
      requestId: this.getRequestId?.(),
    };
  }

  /**
   * Get default user-facing message for this error code (protected)
   */
  protected getDefaultUserMessageValue(): string {
    const messages: Record<ErrorCode, string> = {
      [ErrorCode.VALIDATION_ERROR]: 'Invalid input provided',
      [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
      [ErrorCode.MISSING_FIELD]: 'Required field is missing',
      [ErrorCode.UNAUTHORIZED]: 'Authentication required',
      [ErrorCode.FORBIDDEN]: 'You do not have permission to perform this action',
      [ErrorCode.NOT_FOUND]: 'Resource not found',
      [ErrorCode.USER_NOT_FOUND]: 'User not found',
      [ErrorCode.PRODUCT_NOT_FOUND]: 'Product not found',
      [ErrorCode.ORDER_NOT_FOUND]: 'Order not found',
      [ErrorCode.PAYMENT_FAILED]: 'Payment processing failed',
      [ErrorCode.PAYMENT_REQUIRED]: 'Payment is required',
      [ErrorCode.INSUFFICIENT_STOCK]: 'Not enough items in stock',
      [ErrorCode.INVALID_STATE]: 'Invalid operation for current state',
      [ErrorCode.RATE_LIMITED]: 'Too many requests, please try again later',
      [ErrorCode.STRIPE_ERROR]: 'Payment service error',
      [ErrorCode.DATABASE_ERROR]: 'Database error',
      [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred',
      [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
    };
    return messages[this.code] || 'An error occurred';
  }

  /**
   * Optional hook for subclasses to provide request ID
   */
  getRequestId?(): string | undefined;
}

/**
 * Validation Error wrapper for Zod errors
 *
 * Wraps Zod validation errors with structured field-level errors
 * for detailed API error responses.
 */
export class ValidationError extends AppError {
  /**
   * Field-level validation errors
   * Maps field names to array of error messages
   */
  public readonly fields: Record<string, string[]>;

  constructor(
    message: string,
    fields: Record<string, string[]>,
    cause?: ZodError | Error,
    userMessage?: string
  ) {
    super(
      message,
      ErrorCode.VALIDATION_ERROR,
      400,
      cause,
      userMessage || 'Invalid input provided'
    );
    this.fields = fields;
  }

  toResponse(): ValidationErrorResponse {
    return {
      error: this.code,
      message: this.userMessage || this.getDefaultUserMessageValue(),
      statusCode: this.statusCode,
      fields: this.fields,
      requestId: this.getRequestId?.(),
    };
  }

  /**
   * Create from Zod error
   *
   * Wraps a Zod validation error for consistent error handling.
   */
  static fromZod(error: ZodError, userMessage?: string): ValidationError {
    const fieldErrors = error.flatten().fieldErrors;
    const fields: Record<string, string[]> = {};

    for (const [key, messages] of Object.entries(fieldErrors)) {
      fields[key] = messages as string[];
    }

    return new ValidationError(
      'Validation failed',
      fields,
      error,
      userMessage
    );
  }
}

/**
 * Not Found Error
 *
 * Use when a requested resource doesn't exist.
 */
export class NotFoundError extends AppError {
  constructor(message: string, resource?: string) {
    const code = mapResourceToNotFoundCode(resource);
    super(
      message,
      code,
      404,
      undefined,
      resource ? `${resource.replace(/([A-Z])/g, ' $1').trim()} not found` : 'Resource not found'
    );
  }
}

function mapResourceToNotFoundCode(resource?: string): ErrorCode {
  if (!resource) return ErrorCode.NOT_FOUND;
  const key = `${resource.toUpperCase()}_NOT_FOUND` as keyof typeof ErrorCode;
  return ErrorCode[key] || ErrorCode.NOT_FOUND;
}

/**
 * Unauthorized Error
 *
 * Use when authentication is required but missing or invalid.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', userMessage?: string) {
    super(
      message,
      ErrorCode.UNAUTHORIZED,
      401,
      undefined,
      userMessage
    );
  }
}

/**
 * Forbidden Error
 *
 * Use when user is authenticated but lacks permission.
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Permission denied', userMessage?: string) {
    super(
      message,
      ErrorCode.FORBIDDEN,
      403,
      undefined,
      userMessage || 'You do not have permission to perform this action'
    );
  }
}

/**
 * Payment Error
 *
 * Use for Stripe or payment processing failures.
 */
export class PaymentError extends AppError {
  constructor(
    message: string,
    originalError?: unknown,
    userMessage?: string
  ) {
    super(
      message,
      ErrorCode.PAYMENT_FAILED,
      502,
      originalError,
      userMessage || 'Payment processing failed. Please try again.'
    );
  }
}

/**
 * Database Error
 *
 * Use for database connection or query failures.
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(
      message,
      ErrorCode.DATABASE_ERROR,
      503,
      originalError,
      'Database error occurred'
    );
  }
}

/**
 * Rate Limited Error
 *
 * Use when request limits are exceeded.
 */
export class RateLimitedError extends AppError {
  constructor(
    message: string,
    public retryAfter?: number,
    userMessage?: string
  ) {
    super(
      message,
      ErrorCode.RATE_LIMITED,
      429,
      undefined,
      userMessage ||
        getDefaultUserMessageForCode(ErrorCode.RATE_LIMITED)
    );
  }

  toResponse(): RateLimitedErrorResponse {
    return {
      error: this.code,
      message: this.userMessage || getDefaultUserMessageForCode(ErrorCode.RATE_LIMITED),
      statusCode: this.statusCode,
      retryAfter: this.retryAfter,
      requestId: this.getRequestId?.(),
    };
  }
}

/**
 * Get default user-facing message for an error code
 */
function getDefaultUserMessageForCode(code: ErrorCode): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.VALIDATION_ERROR]: 'Invalid input provided',
    [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
    [ErrorCode.MISSING_FIELD]: 'Required field is missing',
    [ErrorCode.UNAUTHORIZED]: 'Authentication required',
    [ErrorCode.FORBIDDEN]: 'You do not have permission to perform this action',
    [ErrorCode.NOT_FOUND]: 'Resource not found',
    [ErrorCode.USER_NOT_FOUND]: 'User not found',
    [ErrorCode.PRODUCT_NOT_FOUND]: 'Product not found',
    [ErrorCode.ORDER_NOT_FOUND]: 'Order not found',
    [ErrorCode.PAYMENT_FAILED]: 'Payment processing failed',
    [ErrorCode.PAYMENT_REQUIRED]: 'Payment is required',
    [ErrorCode.INSUFFICIENT_STOCK]: 'Not enough items in stock',
    [ErrorCode.INVALID_STATE]: 'Invalid operation for current state',
    [ErrorCode.RATE_LIMITED]: 'Too many requests, please try again later',
    [ErrorCode.STRIPE_ERROR]: 'Payment service error',
    [ErrorCode.DATABASE_ERROR]: 'Database error',
    [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred',
    [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  };
  return messages[code] || 'An error occurred';
}

/**
 * Is AppError type guard
 *
 * Checks if an error is an AppError instance.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Is ValidationError type guard
 *
 * Checks if an error is a ValidationError instance.
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Convert any error to AppError
 *
 * Standardizes error handling by converting unknown errors to AppError.
 */
export function toAppError(error: unknown, message?: string): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      message || error.message,
      ErrorCode.INTERNAL_ERROR,
      500,
      error
    );
  }

  if (typeof error === 'string') {
    return new AppError(error, ErrorCode.INTERNAL_ERROR, 500);
  }

  return new AppError(
    message || 'An unknown error occurred',
    ErrorCode.INTERNAL_ERROR,
    500,
    error
  );
}

// --------------------------------------------------------------------------
// Response Types
// --------------------------------------------------------------------------

/**
 * Standard error response payload
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  requestId?: string;
}

/**
 * Validation error response with field-level errors
 */
export interface ValidationErrorResponse extends ErrorResponse {
  fields: Record<string, string[]>;
}

/**
 * Rate limited error response with retry information
 */
export interface RateLimitedErrorResponse extends ErrorResponse {
  retryAfter?: number;
}

/**
 * Error handler for Hono middleware
 *
 * Converts caught errors to appropriate HTTP responses.
 */
export function handleErrorResponse(error: unknown, c: { json: (body: unknown, status?: number) => unknown }): unknown {
  const appError = toAppError(error);
  const response = appError.toResponse();
  return c.json(response, response.statusCode);
}
