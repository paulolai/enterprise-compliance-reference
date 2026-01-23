/**
 * Structured Logging Framework
 *
 * Provides contextual, structured logging for deep observability.
 * All logs include request IDs, timestamps, and context metadata.
 *
 * KEY FEATURES:
 * - Request-scoped logging with request IDs
 * - Structured context for filters and aggregation
 * - Multiple log levels based on environment
 * - Error logging with stack traces
 *
 * @see ADR-12: Deep Observability (Mandatory Tracing)
 * @see PRODUCTION_READY_PLAN.md Part 3.1: Structured Logging
 */

import { env } from './env';

/**
 * Log level enum
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log level names
 */
export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARN]: 'warn',
  [LogLevel.ERROR]: 'error',
};

/**
 * Map string log level to enum
 */
const parseLogLevel = (level: string): LogLevel => {
  const upper = level.toUpperCase();
  return LogLevel[upper as keyof typeof LogLevel] ?? LogLevel.INFO;
};

/**
 * Current log level threshold
 * Logs below this level are filtered out.
 */
export const currentLogLevel = parseLogLevel(env.LOG_LEVEL);

/**
 * Request ID token for async context
 * In Node.js, we use async_hooks for request-scoped storage.
 */
let requestIdStore: {
  getId: () => string | undefined;
  setId: (id: string) => void;
  clear: () => void;
} | null = null;

/**
 * Initialize async context for request IDs
 */
export function initAsyncContext(): void {
  // Lazy load async_hooks only in Node.js
  if (typeof process === 'undefined' || requestRequestIdStore) {
    return;
  }

  const { AsyncLocalStorage } = require('node:async_hooks');
  const context = new AsyncLocalStorage<string>();

  requestRequestIdStore = {
    getId: () => context.getStore(),
    setId: (id: string) => context.run(id, () => {}),
    clear: () => context.run('', () => {}),
  };
}

/**
 * Generate a UUID v4 for request IDs
 */
export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older Node.js versions
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get current request ID from async context
 */
export function getRequestId(): string | undefined {
  return requestRequestIdStore?.getId();
}

/**
 * Set request ID in async context
 */
export function setRequestId(id: string): void {
  requestRequestIdStore?.setId(id);
}

/**
 * Clear request ID from async context
 */
export function clearRequestId(): void {
  requestRequestIdStore?.clear();
}

/**
 * Log context metadata
 */
export interface LogContext {
  request_id?: string;
  action?: string;
  user_id?: string;
  session_id?: string;
  cart_id?: string;
  order_id?: string;
  payment_intent_id?: string;
  [meta: string]: unknown;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  level: string;
  timestamp: string;
  message: string;
  context?: LogContext;
  error?: {
    name?: string;
    message: string;
    stack?: string;
    code?: string;
  };
  duration_ms?: number;
}

/**
 * Timed log utility
 */
export class TimedLog {
  private start: number;

  constructor(
    private readonly logger: Logger,
    private readonly level: LogLevel,
    private readonly message: string,
    private readonly context?: LogContext
  ) {
    this.start = performance.now();
  }

  /**
   * End the timer and log the duration
   */
  end(additionalContext?: LogContext): void {
    const duration = performance.now() - this.start;
    this.logger.log(this.level, this.message, {
      ...this.context,
      ...additionalContext,
      duration_ms: Math.round(duration),
    });
  }
}

/**
 * Logger interface for scoped logging
 */
export interface Logger {
  /**
   * Create a child logger with additional context
   */
  child(context: Partial<LogContext>): Logger;

  /**
   * Log a debug message
   */
  debug(message: string, context?: Partial<LogContext>): void;

  /**
   * Log an info message
   */
  info(message: string, context?: Partial<LogContext>): void;

  /**
   * Log a warning message
   */
  warn(message: string, context?: Partial<LogContext>): void;

  /**
   * Log an error message
   */
  error(message: string, error?: unknown, context?: Partial<LogContext>): void;

  /**
   * Start a timed operation
   */
  time(message: string, context?: Partial<LogContext>): TimedLog;

  /**
   * Internal log method
   */
  log(level: LogLevel, message: string, context?: LogContext): void;

  /**
   * Get the current context
   */
  getContext(): LogContext;
}

/**
 * Logger implementation
 */
class LoggerImpl implements Logger {
  constructor(private context: LogContext = {}) {}

  child(childContext: Partial<LogContext>): Logger {
    return new LoggerImpl({ ...this.context, ...childContext, request_id: this.context.request_id || getRequestId() });
  }

  debug(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: unknown, context?: Partial<LogContext>): void {
    const errorContext = this.serializeError(error);
    this.log(LogLevel.ERROR, message, { ...context, error: errorContext });
  }

  time(message: string, context?: Partial<LogContext>): TimedLog {
    return new TimedLog(this, LogLevel.INFO, message, context);
  }

  log(level: LogLevel, message: string, context?: LogContext): void {
    if (level < currentLogLevel) {
      return;
    }

    const entry: LogEntry = {
      level: LOG_LEVEL_NAMES[level],
      timestamp: new Date().toISOString(),
      message,
      context: {
        ...this.context,
        ...context,
        // Always include request_id if available
        request_id: this.context.request_id || context?.request_id || getRequestId(),
      },
    };

    this.write(entry);
  }

  getContext(): LogContext {
    return { ...this.context };
  }

  private write(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    // Write to appropriate stream based on level
    if (entry.level === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  private serializeError(error: unknown): LogEntry['error'] {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as { code?: string }).code,
      };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    if (error && typeof error === 'object') {
      return {
        name: (error as { name?: string }).name,
        message: String(error),
        ...(error as { code?: string }).code,
      };
    }

    return { message: 'Unknown error' };
  }
}

/**
 * Root logger instance
 */
export const logger: Logger = new LoggerImpl();

/**
 * Create a logger for a specific action
 *
 * Example:
 * const actionLogger = logger.forAction('checkout');
 * actionLogger.info('Starting checkout process', { userId });
 */
logger.forAction = function (action: string): Logger {
  return this.child({ action });
} as Logger['child'];

/**
 * Create a logger for a specific user
 *
 * Example:
 * const userLogger = logger.forUser(userId);
 * userLogger.info('User login');
 */
logger.forUser = function (userId: string): Logger {
  return this.child({ user_id: userId });
} as Logger['child'];

/**
 * Create a logger with request ID
 *
 * Example:
 * const requestLogger = logger.withRequest(requestId);
 * requestLogger.info('Processing request');
 */
logger.withRequest = function (requestId: string): Logger {
  return this.child({ request_id: requestId });
} as Logger['child'];

// --------------------------------------------------------------------------
// Hono Middleware
// --------------------------------------------------------------------------

/**
 * Request logging middleware for Hono
 *
 * Logs all incoming HTTP requests with timing information.
 */
export async function requestLogger(c: any, next: any) {
  const startTime = performance.now();
  const requestId = c.get('requestId') || generateRequestId();

  // Set request ID in context for this request
  setRequestId(requestId);
  c.set('requestId', requestId);

  const requestLogger = logger.withRequest(requestId);

  requestLogger.info('Incoming request', {
    action: `http_${c.req.method}`,
    method: c.req.method,
    path: c.req.path,
    user_agent: c.req.header('user-agent'),
  });

  try {
    await next();

    const duration = performance.now() - startTime;
    requestLogger.info('Request completed', {
      action: `http_${c.req.method}`,
      status: c.res.status,
      duration_ms: Math.round(duration),
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    requestLogger.error('Request failed', error, {
      action: `http_${c.req.method}`,
      status: c.res.status,
      duration_ms: Math.round(duration),
    });
    throw error;
  } finally {
    clearRequestId();
  }
}

/**
 * Request ID middleware for Hono
 *
 * Generates and adds a request ID to each request.
 */
export function requestIdMiddleware(c: any, next: any) {
  const requestId = c.header('x-request-id') || generateRequestId();
  c.set('requestId', requestId);
  c.header('x-request-id', requestId);
  return next();
}

// --------------------------------------------------------------------------
// React Error Boundary Integration
// --------------------------------------------------------------------------

/**
 * Log React error boundary errors
 *
 * Call this from an ErrorBoundary's componentDidCatch or fallback component.
 */
export function logReactError(error: Error, errorInfo: { componentStack?: string }) {
  logger.error('React error boundary caught error', error, {
    action: 'react_error_boundary',
    component_stack: errorInfo.componentStack,
  });
}

// --------------------------------------------------------------------------
// Development/Console Integration
// --------------------------------------------------------------------------

/**
 * Pretty print log entries in development
 * For production, logs are written as JSON.
 */
export function prettyPrint(entry: LogEntry): string {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  const level = entry.level.padEnd(5);
  const ctx = entry.context ? ` [${Object.entries(entry.context).map(([k, v]) => `${k}=${v}`).join(' ')}]` : '';

  let message = `${time} ${level} ${entry.message}${ctx}`;

  if (entry.error) {
    message += `\n  ${entry.error.name}: ${entry.error.message}`;
    if (entry.error.stack) {
      message += `\n${entry.error.stack.split('\n').map(l => `  ${l}`).join('\n')}`;
    }
  }

  return message;
}

/**
 * Enable pretty printing for console output in development
 */
if (env.NODE_ENV === 'development') {
  const originalConsole = { ...console };
  logger.log = function (level: LogLevel, message: string, context?: LogContext) {
    if (level < currentLogLevel) {
      return;
    }

    const entry: LogEntry = {
      level: LOG_LEVEL_NAMES[level],
      timestamp: new Date().toISOString(),
      message,
      context: {
        ...this.getContext(),
        ...context,
        request_id: this.getContext().request_id || context?.request_id || getRequestId(),
      },
    };

    const pretty = prettyPrint(entry);
    switch (level) {
      case LogLevel.DEBUG:
        originalConsole.debug(pretty);
        break;
      case LogLevel.INFO:
        originalConsole.info(pretty);
        break;
      case LogLevel.WARN:
        originalConsole.warn(pretty);
        break;
      case LogLevel.ERROR:
        originalConsole.error(pretty);
        break;
    }
  } as Logger['log'];
}

// Initialize async context on module load for Node.js
if (typeof process !== 'undefined') {
  initAsyncContext();
}
