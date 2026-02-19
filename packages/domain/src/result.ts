/**
 * Result<T, E> - Error Handling Pattern
 *
 * This module provides a type-safe alternative to throwing exceptions for error handling.
 * Instead of try/catch blocks, functions return a Result type that explicitly indicates
 * whether the operation succeeded (Success) or failed (Failure).
 *
 * Benefits:
 * - Forces error handling at call site (no silent failures)
 * - Makes control flow explicit and easier to reason about
 * - Reduces try/catch blocks scattered through code
 * - Better type safety - compiler knows about possible error states
 *
 * Based on Rust's Result<T, E> and similar patterns in functional programming.
 */

/**
 * Represents a successful operation result.
 */
export interface Success<T> {
  success: true;
  value: T;
}

/**
 * Represents a failed operation result.
 */
export interface Failure<E> {
  success: false;
  error: E;
}

/**
 * A discriminated union type that represents either a success or a failure.
 *
 * @template T - The type of the success value
 * @template E - The type of the error (defaults to Error)
 *
 * @example
 * ```ts
 * // A function that might fail
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return failure('Division by zero');
 *   }
 *   return success(a / b);
 * }
 *
 * // Using the result
 * const result = divide(10, 2);
 * if (result.success) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error); // 'Division by zero'
 * }
 * ```
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Type guard to check if a Result is a Success.
 *
 * @param result - The result to check
 * @returns true if the result is a Success
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/**
 * Type guard to check if a Result is a Failure.
 *
 * @param result - The result to check
 * @returns true if the result is a Failure
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}

/**
 * Creates a Success result.
 *
 * @param value - The success value
 * @returns A Success result
 */
export function success<T>(value: T): Success<T> {
  return { success: true, value };
}

/**
 * Creates a Failure result.
 *
 * @param error - The error value
 * @returns A Failure result
 */
export function failure<E>(error: E): Failure<E> {
  return { success: false, error };
}

/**
 * Map over the success value of a Result.
 * If the result is a Failure, the failure is propagated unchanged.
 *
 * @param result - The result to map over
 * @param fn - The function to apply to the success value
 * @returns A new Result with the mapped value or the original failure
 *
 * @example
 * ```ts
 * const result = success(5);
 * const doubled = map(result, x => x * 2); // success(10)
 *
 * const failed = failure('error');
 * const unchanged = map(failed, x => x * 2); // failure('error')
 * ```
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return isSuccess(result) ? success(fn(result.value)) : result;
}

/**
 * Chain operations that return Results.
 * If the first result is a Failure, the chain stops and returns the failure.
 * If the first result is a Success, the function is called with its value.
 *
 * @param result - The result to chain from
 * @param fn - The function that returns a new Result
 * @returns The chained Result
 *
 * @example
 * ```ts
 * function validateUser(id: string): Result<User, string> { ... }
 * function calculateDiscount(user: User): Result<number, string> { ... }
 * function applyDiscount(total: number, discount: number): Result<number, string> { ... }
 *
 * const result = chain(
 *   validateUser(userId),
 *   user => calculateDiscount(user),
 *   discount => applyDiscount(total, discount)
 * );
 * ```
 */
export function chain<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
  return isSuccess(result) ? fn(result.value) : result;
}

/**
 * Get the success value or throw if it's a failure.
 * Use this only when you're certain the result cannot fail.
 *
 * @param result - The result to unwrap
 * @returns The success value
 * @throws The error if the result is a failure
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isSuccess(result)) {
    return result.value;
  }
  throw result.error;
}

/**
 * Get the success value or return a default if it's a failure.
 *
 * @param result - The result to unwrap
 * @param defaultValue - The default value to return on failure
 * @returns The success value or the default
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isSuccess(result) ? result.value : defaultValue;
}

/**
 * Get the success value or compute it from the error if it's a failure.
 *
 * @param result - The result to unwrap
 * @param fn - The function to compute a default value from the error
 * @returns The success value or the computed default
 */
export function unwrapOrElse<T, E>(result: Result<T, E>, fn: (error: E) => T): T {
  return isSuccess(result) ? result.value : fn(result.error);
}

/**
 * Transform the error type of a Failure result.
 * If the result is a Success, it is returned unchanged.
 *
 * @param result - The result to transform
 * @param fn - The function to transform the error
 * @returns A Result with the transformed error type or original success
 *
 * @example
 * ```ts
 * const result = failure('Not found');
 * const transformed = mapError(result, e => new Error(e)); // Failure<Error>
 * ```
 */
export function mapError<T, E, EE>(result: Result<T, E>, fn: (error: E) => EE): Result<T, EE> {
  return isFailure(result) ? failure(fn(result.error)) : result;
}

/**
 * Execute different functions based on whether the result is a success or failure.
 *
 * @param result - The result to match on
 * @param onSuccess - The function to call on success
 * @param onFailure - The function to call on failure
 * @returns The result of whichever function was called
 *
 * @example
 * ```ts
 * match(
 *   result,
 *   value => console.log('Success:', value),
 *   error => console.error('Error:', error)
 * );
 * ```
 */
export function match<T, E, R>(result: Result<T, E>, onSuccess: (value: T) => R, onFailure: (error: E) => R): R {
  return isSuccess(result) ? onSuccess(result.value) : onFailure(result.error);
}

/**
 * Combine multiple Results into a single Result of an array.
 * If any result is a Failure, the first failure is returned.
 *
 * @param results - An array of Results to combine
 * @returns A Success with all values, or the first Failure
 *
 * @example
 * ```ts
 * const result1 = success(5);
 * const result2 = success(10);
 * const result3 = success(15);
 *
 * const combined = all([result1, result2, result3]); // success([5, 10, 15])
 *
 * const failed = failure('error');
 * const combined2 = all([result1, failed, result3]); // failure('error')
 * ```
 */
export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (isFailure(result)) {
      return result;
    }
    values.push(result.value);
  }

  return success(values);
}

/**
 * Try a function that might throw and convert its result to a Result.
 *
 * @param fn - The function to try
 * @returns A Result with the function's return value or an Error
 *
 * @example
 * ```ts
 * const result = tryCatch(() => JSON.parse(jsonString));
 * // Result<unknown, SyntaxError>
 * ```
 */
export function tryCatch<T>(fn: () => T): Result<T, Error> {
  try {
    return success(fn());
  } catch (e) {
    return failure(e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * Async version of tryCatch.
 *
 * @param fn - The async function to try
 * @returns A Promise that resolves to a Result
 *
 * @example
 * ```ts
 * const result = await tryCatchAsync(() => fetch(url).then(r => r.json()));
 * // Promise<Result<Response, Error>>
 * ```
 */
export async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try {
    return success(await fn());
  } catch (e) {
    return failure(e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * Create a Result from a Promise.
 * Unlike tryCatchAsync, this handles both rejections and returned Results.
 *
 * @param promise - The promise to resolve
 * @returns A Promise that resolves to a Result
 */
export async function fromPromise<T, E>(promise: Promise<Result<T, E>>): Promise<Result<T, E>> {
  return promise;
}

/**
 * Convert an optional value (nullable) to a Result.
 *
 * @param value - The optional value
 * @param error - The error to return if the value is null/undefined
 * @returns A Success if the value exists, otherwise a Failure
 *
 * @example
 * ```ts
 * const maybeUser = users.find(id);
 * const result = fromNullable(maybeUser, 'User not found');
 * ```
 */
export function fromNullable<T, E>(value: T | null | undefined, error: E): Result<T, E> {
  return value !== null && value !== undefined ? success(value) : failure(error);
}

// Import Zod types locally for the fromZod function
import type { ZodError } from 'zod';

/**
 * Convert a Zod validation result to a Result.
 *
 * Note: Zod's SafeParseResult returns { success: true, data: T } on success,
 * but our Result type expects { success: true, value: T }. This function
 * converts between the two structures.
 *
 * @param parseResult - The Zod parse result
 * @param errorMessage - Error message if validation fails
 * @returns A Result with the validated data or an Error
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * const ItemSchema = z.object({ ... });
 *
 * const result = fromZod(ItemSchema.safeParse(input), 'Invalid item data');
 * ```
 */
export function fromZod<T, E = Error>(
  parseResult: { success: true; data: T } | { success: false; error: ZodError },
  errorMessage?: string
): Result<T, E> {
  if (parseResult.success) {
    // Zod returns { success: true, data: T }, convert to { success: true, value: T }
    return success(parseResult.data);
  }
  // Zod returns { success: false, error: ZodError }, keep as is
  return failure((errorMessage ? new Error(errorMessage) : parseResult.error) as E);
}
