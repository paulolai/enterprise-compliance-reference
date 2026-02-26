# Result<T, E> Pattern: Explicit Error Handling

## Overview

The `Result<T, E>` pattern provides a type-safe alternative to throwing exceptions for error handling. Instead of try/catch blocks, functions return a discriminated union type that explicitly indicates whether the operation succeeded (`Success`) or failed (`Failure`).

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

## Transforming Results

### map - Transform success values

```typescript
import { map } from '../shared/src/result';

const result = success(5);
const doubled = map(result, x => x * 2); // Success(10)
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

## Integration with Zod

### fromZod - Convert Zod validation to Results

```typescript
import { fromZod } from '../shared/src/result';
import { CartItemSchema } from '../shared/src/types';

const parseResult = CartItemSchema.safeParse(input);
const result = fromZod(parseResult);
```
