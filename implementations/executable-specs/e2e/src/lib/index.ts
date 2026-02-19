/**
 * Core Library Module
 *
 * Centralized exports for shared utilities and frameworks.
 *
 * Includes:
 * - Environment configuration (Zod-validated)
 * - Error handling architecture
 * - Structured logging framework
 * - Validation utilities
 */

export * from './env';
export * from './logger';
export * from './validation';

// Explicit exports from errors to avoid conflicts
export {
  ErrorCode,
  ERROR_CODE_STATUS,
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  PaymentError,
  DatabaseError,
  RateLimitedError,
  isAppError,
  isValidationError,
  toAppError,
  handleErrorResponse,
} from './errors';

// Export error response types
export type { ErrorResponse, ValidationErrorResponse, RateLimitedErrorResponse } from './errors';
