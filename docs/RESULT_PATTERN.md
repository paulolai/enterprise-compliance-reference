# Result<T, E> Pattern: Explicit Error Handling

## Overview

The `Result<T, E>` pattern provides a type-safe alternative to throwing exceptions for error handling. Instead of try/catch blocks, functions return a discriminated union type that explicitly indicates whether the operation succeeded (`Success`) or failed (`Failure`).

## Why Use This Pattern?

| Problem | Traditional Exception Handling | Result<T, E> Pattern |
|---------|-------------------------------|---------------------|
| Hidden errors | Can silently catch and ignore errors | Forces handling at call site |
| Control flow | Hard to reason about with nested try/catch | Explicit, linear flow |
| Type safety | Uncaught errors can crash at runtime | Compiler enforces error handling |
| Testability | Requires mocking/stubbing exceptions | Simple assertion testing |

## Import

```typescript
import {
  Result,
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
} from '../shared/src/result';
```

---

## Basic Usage

### Creating Results

```typescript
import { success, failure } from '../shared/src/result';

// Success case
const result1 = success(42);
// { success: true, value: 42 }

// Failure case
const result2 = failure('Something went wrong');
// { success: false, error: 'Something went wrong' }
```

### Type Guards

```typescript
import { isSuccess, isFailure } from '../shared/src/result';

if (isSuccess(result)) {
  // TypeScript knows result is Success<T>
  console.log(result.value);
}

if (isFailure(result)) {
  // TypeScript knows result is Failure<E>
  console.error(result.error);
}
```

---

## Transforming Results

### map - Transform success values

```typescript
import { map } from '../shared/src/result';

const result = success(5);
const doubled = map(result, x => x * 2);
// Success(10)

// Failures propagate unchanged
const failed = failure('error');
const unchanged = map(failed, x => x * 2);
// Failure('error')
```

### chain - Compose operations that return Results

```typescript
import { chain } from '../shared/src/result';

function parseAge(input: string): Result<number, string> {
  const age = parseInt(input, 10);
  return isNaN(age) ? failure('Invalid number') : success(age);
}

function validateAdult(age: number): Result<number, string> {
  return age >= 18 ? success(age) : failure('Must be 18 or older');
}

// Chain operations together
const result = chain(
  parseAge('25'),
  validateAdult
);
// Success(25)
```

The chain stops at the first failure, so if `parseAge` fails, `validateAdult` won't be called.

---

## Extracting Values

### unwrap - Get value or throw (use with caution)

```typescript
import { unwrap } from '../shared/src/result';

const result = success(42);
const value = unwrap(result); // 42

const failed = failure('error');
unwrap(failed); // throws error
```

### unwrapOr - Get value or default

```typescript
import { unwrapOr } from '../shared/src/result';

const result = failure<number, string>('error');
const value = unwrapOr(result, 0); // 0
```

### unwrapOrElse - Compute default from error

```typescript
import { unwrapOrElse } from '../shared/src/result';

const result = failure<number, string>('404');
const value = unwrapOrElse(result, e => parseInt(e));
// 404
```

---

## Error Handling

### mapError - Transform error values

```typescript
import { mapError } from '../shared/src/result';

const result = failure<number, string>('not found');
const transformed = mapError(result, e => new Error(e));
// Failure(Error('not found'))
```

### match - Pattern matching on Result

```typescript
import { match } from '../shared/src/result';

const result = success(42);

const message = match(
  result,
  value => `Success: ${value}`,
  error => `Error: ${error}`
);
// 'Success: 42'
```

---

## Combining Results

### all - Combine multiple Results into an array

```typescript
import { all } from '../shared/src/result';

const results = [
  success(1),
  success(2),
  success(3)
];

const combined = all(results);
// Success([1, 2, 3])

// Returns first failure if any
const withFailure = [
  success(1),
  failure('error'),
  success(3)
];

const failed = all(withFailure);
// Failure('error')
```

---

## Integration with Other Libraries

### tryCatch - Convert exceptions to Results

```typescript
import { tryCatch } from '../shared/src/result';

const result = tryCatch(() => {
  return JSON.parse('{"valid": "json"}');
});
// Success({ valid: 'json' })

const failed = tryCatch(() => {
  return JSON.parse('{invalid}');
});
// Failure(SyntaxError)
```

### tryCatchAsync - Async version

```typescript
import { tryCatchAsync } from '../shared/src/result';

const result = await tryCatchAsync(async () => {
  const response = await fetch('https://api.example.com');
  return response.json();
});
// Result<unknown, Error>
```

### fromNullable - Convert null/undefined to Results

```typescript
import { fromNullable } from '../shared/src/result';

const user = users.find(id);
const result = fromNullable(user, 'User not found');

if (isSuccess(result)) {
  // TypeScript knows result.value is not null
  console.log(result.value.name);
}
```

### fromZod - Convert Zod validation to Results

```typescript
import { fromZod } from '../shared/src/result';
import { CartItemSchema } from '../shared/src/types';

const input = { sku: 'ABC123', name: 'Test', price: 1000, quantity: 1, weightInKg: 0.5 };
const parseResult = CartItemSchema.safeParse(input);
const result = fromZod(parseResult);

if (isSuccess(result)) {
  // result.value is the validated cart item
} else {
  // result.error is the ZodError
}
```

---

## Real-World Examples

### Example 1: API Response Handling

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

function parseApiResponse<T>(response: ApiResponse<T>): Result<T, string> {
  if (!response.success) {
    return failure(response.error?.message || 'Unknown error');
  }
  return fromNullable(response.data, 'No data in response');
}

// Usage
const result = parseApiResponse<User>(apiResponse);

match(
  result,
  user => displayUserProfile(user),
  error => showErrorMessage(error)
);
```

### Example 2: Multi-step Validation Workflow

```typescript
function validateOrder(items: CartItem[], user: User): Result<ValidatedOrder, string> {
  return chain(
    chain(
      validateCartNotEmpty(items),
      cart => validateUserAccount(cart, user)
    ),
    validateInventoryAvailability
  );
}
```

### Example 3: Safe Pricing Calculation

```typescript
function safeCalculatePricing(
  items: CartItem[],
  user: User
): Result<PricingResult, Error> {
  return tryCatch(() => {
    return PricingEngine.calculate(items, user);
  });
}

const result = safeCalculatePricing(items, user);

if (isSuccess(result)) {
  console.log(`Total: ${formatCurrency(result.value.grandTotal)}`);
} else {
  console.error(`Calculation failed: ${result.error.message}`);
}
```

---

## Best Practices

### DO Use Results
- For operations that can fail as part of normal business logic
- When you want to force callers to handle errors
- When composing multiple operations that can fail
- For validation and parsing operations

### DON'T Use Results
- For truly exceptional errors (should crash the program)
- As a substitute for simple if/else conditionals
- When performance is critical and exceptions are rare

---

## Type Safety

The `Result<T, E>` type uses TypeScript's discriminated union feature for compile-time guarantees:

```typescript
function process(result: Result<number, string>) {
  if (isSuccess(result)) {
    // TypeScript knows result.value: number
    console.log(result.value.toFixed(2));
  } else {
    // TypeScript knows result.error: string
    console.error(result.error.toUpperCase());
  }
}
```

---

## Running Tests

```bash
cd implementations/typescript-vitest
npm run test result.spec.ts
```

All 42 tests should pass, demonstrating:
- Type guard functionality
- Factory functions
- Mapping and chaining
- Value extraction methods
- Error transformations
- Combining multiple results
- Integration with external libraries
- Practical real-world scenarios

---

## Reference

See `implementations/shared/src/result.ts` for the full implementation and `implementations/typescript-vitest/test/result.spec.ts` for comprehensive examples.
