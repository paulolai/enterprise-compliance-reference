import { describe, it, expect } from 'vitest';
import {
  Result,
  Success,
  Failure,
  success,
  failure,
  isSuccess,
  isFailure,
  map,
  chain,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  mapError,
  match,
  all,
  tryCatch,
  tryCatchAsync,
  fromNullable,
  fromZod
} from '../../shared/src/result';
import { CartItemSchema } from '../../shared/src/types';
import { PricingEngine, CartItem, User } from '../../shared/src';
import { z } from 'zod';

describe('Result Pattern: Error Handling', () => {
  describe('Type Guards', () => {
    it('isSuccess returns true for Success', () => {
      const result: Result<number, string> = success(42);
      expect(isSuccess(result)).toBe(true);
      expect(isFailure(result)).toBe(false);
    });

    it('isFailure returns true for Failure', () => {
      const result: Result<number, string> = failure('error');
      expect(isFailure(result)).toBe(true);
      expect(isSuccess(result)).toBe(false);
    });

    it('type guard narrows type correctly', () => {
      const result: Result<number, string> = success(42);
      if (isSuccess(result)) {
        // TypeScript knows result is Success<number>
        expect(result.value).toBe(42);
      }
    });
  });

  describe('Factory Functions', () => {
    it('success creates a Success result', () => {
      const result = success(42);
      expect(result).toEqual({ success: true, value: 42 });
    });

    it('failure creates a Failure result', () => {
      const result = failure('error');
      expect(result).toEqual({ success: false, error: 'error' });
    });
  });

  describe('map - Transform success values', () => {
    it('maps over a Success result', () => {
      const result = success(5);
      const doubled = map(result, x => x * 2);
      expect(doubled).toEqual(success(10));
    });

    it('propagates Failure unchanged', () => {
      const result = failure('error');
      const doubled = map(result, (x: number) => x * 2);
      expect(doubled).toEqual(failure('error'));
    });

    it('supports type transformation', () => {
      const result = success('5');
      const asNumber = map(result, x => parseInt(x, 10));
      expect(asNumber).toEqual(success(5));
    });
  });

  describe('chain - Compose operations that return Results', () => {
    it('chains successful operations', () => {
      const step1 = success(5);
      const step2 = chain(step1, x => success(x * 2));
      const step3 = chain(step2, x => success(x + 1));
      expect(step3).toEqual(success(11));
    });

    it('stops at first failure', () => {
      const step1 = success(5);
      const step2 = chain(step1, _ => failure<string>('error'));
      const step3 = chain(step2, x => success((x as number) + 1)); // Never called
      expect(step3).toEqual(failure('error'));
    });

    it('Complex workflow example: user validation', () => {
      // Simulate a workflow of validation steps
      function parseAge(input: string): Result<number, string> {
        const age = parseInt(input, 10);
        return isNaN(age) ? failure('Invalid number') : success(age);
      }

      function validateAge(age: number): Result<number, string> {
        return age >= 18 ? success(age) : failure('Must be 18 or older');
      }

      function calculateEligibility(age: number): Result<string, string> {
        return success(age <= 65 ? 'Premium' : 'Senior');
      }

      const result = chain(
        chain(parseAge('25'), validateAge),
        calculateEligibility
      );
      expect(result).toEqual(success('Premium'));
    });
  });

  describe('unwrap - Extract values with fallbacks', () => {
    it('unwrap throws on Failure', () => {
      const result = failure<Error>(new Error('error'));
      expect(() => unwrap(result)).toThrow('error');
    });

    it('unwrap returns value from Success', () => {
      const result = success(42);
      expect(unwrap(result)).toBe(42);
    });

    it('unwrapOr returns default on Failure', () => {
      const result = failure<string>('error');
      expect(unwrapOr(result, 0)).toBe(0);
    });

    it('unwrapOr returns value from Success', () => {
      const result = success(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    it('unwrapOrElse computes default from error', () => {
      const result = failure<string>('error');
      expect(unwrapOrElse(result, e => parseInt(e, 10))).toBe(NaN);
    });

    it('unwrapOrElse returns value from Success', () => {
      const result = success(42);
      expect(unwrapOrElse(result, e => 0)).toBe(42);
    });
  });

  describe('mapError - Transform error values', () => {
    it('transforms error in Failure', () => {
      const result = failure<string>('error');
      const transformed = mapError(result, e => new Error(e));
      expect(isFailure(transformed)).toBe(true);
      if (isFailure(transformed)) {
        expect(transformed.error).toBeInstanceOf(Error);
        expect(transformed.error.message).toBe('error');
      }
    });

    it('leaves Success unchanged', () => {
      const result = success(5);
      const transformed = mapError(result, e => new Error(String(e)));
      expect(transformed).toEqual(success(5));
    });
  });

  describe('match - Pattern match on Result', () => {
    it('executes onSuccess for Success', () => {
      const result = success(42);
      const calledWith = match(
        result,
        value => value,
        _ => -1
      );
      expect(calledWith).toBe(42);
    });

    it('executes onFailure for Failure', () => {
      const result = failure<string>('error');
      const calledWith = match<never, string, string>(
        result,
        _ => -1 as unknown as string,
        error => `handled: ${error}`
      );
      expect(calledWith).toBe('handled: error');
    });

    it('Can be used for side effects', () => {
      const result = success(42);
      let sideEffect = 0;
      match(
        result,
        value => { sideEffect = value; },
        _ => {}
      );
      expect(sideEffect).toBe(42);
    });
  });

  describe('all - Combine multiple Results', () => {
    it('combines multiple Success results', () => {
      const results = [success(1), success(2), success(3)] as const;
      const combined = all([...results]);
      expect(combined).toEqual(success([1, 2, 3]));
    });

    it('returns first Failure', () => {
      const results = [success(1), failure('error'), success(3)] as const;
      const combined = all([...results]);
      expect(combined).toEqual(failure('error'));
    });

    it('handles empty array', () => {
      const combined = all<[], never>([]);
      expect(combined).toEqual(success([]));
    });

    it('preserves type information', () => {
      const r1: Result<number, never> = success(42);
      const r2: Result<string, never> = success('hello');
      const r3: Result<boolean, never> = success(true);
      const combined = all<any, never>([r1, r2, r3] as any[]);
      expect(combined).toEqual(success([42, 'hello', true]));
    });
  });

  describe('tryCatch - Convert exceptions to Results', () => {
    it('converts successful function to Success', () => {
      const result = tryCatch(() => 1 + 1);
      expect(result).toEqual(success(2));
    });

    it('converts thrown exception to Failure', () => {
      const result = tryCatch(() => {
        throw new Error('test error');
      });
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('test error');
      }
    });

    it('converts thrown string to Error', () => {
      const result = tryCatch(() => {
        throw 'string error';
      });
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('string error');
      }
    });
  });

  describe('tryCatchAsync - Async version of tryCatch', () => {
    it('converts successful async function to Success', async () => {
      const result = await tryCatchAsync(async () => {
        return 1 + 1;
      });
      expect(result).toEqual(success(2));
    });

    it('converts rejected promise to Failure', async () => {
      const result = await tryCatchAsync(async () => {
        throw new Error('async error');
      });
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('async error');
      }
    });
  });

  describe('fromNullable - Convert optional values to Results', () => {
    it('converts null to Failure', () => {
      const result = fromNullable<number, string>(null, 'value is null');
      expect(result).toEqual(failure('value is null'));
    });

    it('converts undefined to Failure', () => {
      const result = fromNullable<number, string>(undefined, 'value is undefined');
      expect(result).toEqual(failure('value is undefined'));
    });

    it('converts value to Success', () => {
      const result = fromNullable<number, string>(42, 'should not happen');
      expect(result).toEqual(success(42));
    });

    it('type guard narrows type correctly', () => {
      const maybeValue: string | null = 'hello';
      const result = fromNullable(maybeValue, 'not found');
      if (isSuccess(result)) {
        // TypeScript knows result.value is string (not null)
        expect(result.value.toUpperCase()).toBe('HELLO');
      }
    });
  });

  describe('fromZod - Convert Zod validation results to Results', () => {
    it('converts successful Zod parse to Success', () => {
      const input = { sku: 'ABC123', name: 'Test Item', price: 1000, quantity: 2, weightInKg: 1 };
      const parseResult = CartItemSchema.safeParse(input);
      const result = fromZod(parseResult);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.sku).toBe('ABC123');
      }
    });

    it('converts failed Zod parse to Failure', () => {
      const invalidInput = { sku: '', name: 'Test' }; // Missing required fields
      const parseResult = CartItemSchema.safeParse(invalidInput);
      const result = fromZod<z.infer<typeof CartItemSchema>, z.ZodError>(parseResult);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        // Check error is a ZodError with expected structure
        expect(result.error.name).toBe('ZodError');
        expect(Array.isArray(result.error.issues)).toBe(true);
      }
    });

    it('supports custom error message', () => {
      const invalidInput = { sku: '', name: 'Test' };
      const parseResult = CartItemSchema.safeParse(invalidInput);
      const result = fromZod<z.infer<typeof CartItemSchema>, Error>(parseResult, 'Invalid cart item');

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Invalid cart item');
      }
    });
  });

  describe('Practical Examples', () => {
    it('Example: Division with proper error handling', () => {
      function divide(a: number, b: number): Result<number, string> {
        if (b === 0) {
          return failure('Division by zero');
        }
        return success(a / b);
      }

      // Success case
      const result1 = divide(10, 2);
      expect(result1).toEqual(success(5));

      // Failure case
      const result2 = divide(10, 0);
      expect(result2).toEqual(failure('Division by zero'));
    });

    it('Example: User lookup with chained validation', () => {
      interface User {
        id: string;
        name: string;
        age: number;
      }

      const users: User[] = [
        { id: '1', name: 'Alice', age: 25 },
        { id: '2', name: 'Bob', age: 17 }
      ];

      function findUser(id: string): Result<User, string> {
        return fromNullable(users.find(u => u.id === id), `User ${id} not found`);
      }

      function validateAdult(user: User): Result<User, string> {
        return user.age >= 18 ? success(user) : failure('User must be 18 or older');
      }

      function getUserName(user: User): Result<string, never> {
        return success(user.name);
      }

      // Valid adult user
      const result1 = chain(findUser('1'), validateAdult);
      expect(result1).toEqual(success(users[0]));

      // Underage user
      const result2 = chain(findUser('2'), validateAdult);
      expect(result2).toEqual(failure('User must be 18 or older'));

      // Non-existent user
      const result3 = chain(findUser('3'), validateAdult);
      expect(result3).toEqual(failure('User 3 not found'));

      // Chaining transformations
      const finalResult = chain(chain(findUser('1'), validateAdult), getUserName);
      expect(finalResult).toEqual(success('Alice'));
    });

    it('Example: API response parsing', () => {
      interface ApiResponse {
        success: boolean;
        data?: { id: string; value: number };
        error?: { code: string; message: string };
      }

      function parseApiResponse(response: ApiResponse): Result<{ id: string; value: number }, string> {
        if (!response.success) {
          return failure(response.error?.message || 'Unknown error');
        }
        return fromNullable(response.data, 'No data in response');
      }

      // Success response
      const response1: ApiResponse = {
        success: true,
        data: { id: '123', value: 42 }
      };
      expect(parseApiResponse(response1)).toEqual(success({ id: '123', value: 42 }));

      // Error response
      const response2: ApiResponse = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' }
      };
      expect(parseApiResponse(response2)).toEqual(failure('Resource not found'));

      // Missing data
      const response3: ApiResponse = {
        success: true
      };
      expect(parseApiResponse(response3)).toEqual(failure('No data in response'));
    });
  });

  describe('Integration with Pricing Engine (Example)', () => {
    it('Example: Safe calculation with Result pattern', () => {
      function safeCalculate(items: CartItem[], user: User): Result<number, Error> {
        return tryCatch(() => {
          const result = PricingEngine.calculate(items, user);
          return result.grandTotal;
        });
      }

      const validItems: CartItem[] = [
        { sku: 'ABC', name: 'Test', price: 1000, quantity: 2, weightInKg: 1 }
      ];
      const user: User = { tenureYears: 5 };

      const result = safeCalculate(validItems, user);
      expect(isSuccess(result)).toBe(true);
    });
  });
});
