# TypeScript Testing Framework Guide

> **The Single Source of Truth for Writing Tests in TypeScript Projects**

This document defines the **mandatory standards** for writing tests in TypeScript projects. It replaces ad-hoc patterns with a canonical, unified framework.

## 1. Core Philosophy

- **Consistency**: All tests of a given type must look the same
- **Abstraction**: Use standard helpers and test utilities instead of reinventing setup logic
- **Evaluation**: Use appropriate evaluation methods for your test type (assertions, expectations, or higher-level evaluation tools)
- **Deterministic Tests**: Tests should be deterministic and produce consistent results
- **Fast Execution**: Tests should run quickly to enable rapid development feedback

---

## 2. Decision Tree: "How do I test this?"

| If you are testing... | Use... | Location |
| :--- | :--- | :--- |
| **User Conversation Flow** (CLI bots, AI agents, Chat interfaces) | **Integration Test** with Evaluation Framework | `src/tests/integration/` |
| **Real API Interactions** (External services, Databases) | **Component Test** with Assertions | `src/tests/component/` |
| **Internal Logic** (Parsers, Utilities, Pure functions) | **Unit Test** with Assertions | `src/tests/unit/` |
| **Frontend Components** (React/Vue/Angular components) | **Component Test** with Testing Library | `src/tests/components/` or `*.test.tsx` |

---

## 3. Testing Tools & Stack

### Recommended Stack

#### For Node.js Backend/General TypeScript:
- **Test Runner**: Jest or Vitest
- **Assertion Library**: Built-in Jest/Vitest assertions
- **Mocking**: Jest/Vitest mock functions
- **Test Utils**: Custom test utilities (see Section 4)

#### For Frontend (React):
- **Test Runner**: Jest or Vitest
- **Testing Library**: React Testing Library (`@testing-library/react`)
- **User Simulation**: userEvent from `@testing-library/user-event`
- **Mocking**: Jest/Vitest + `msw` for API mocking

#### For End-to-End:
- **Framework**: Playwright or Cypress
- **Purpose**: Full browser testing across multiple viewports

---

## 4. Canonical Templates

### A. Unit Test Template (Pure Functions, Internal Logic)

Use this for testing functions with no external dependencies or side effects.

```typescript
/**
 * Unit test for [Feature Name].
 * Verifies [specific behavior] with mocked dependencies.
 */
import { describe, it, expect } from 'vitest'; // or jest
import { functionToTest } from './module';

describe('functionToTest', () => {
  it('should return expected output for valid input', () => {
    // Arrange
    const input = {
      param1: 'value1',
      param2: 42
    };

    // Act
    const result = functionToTest(input);

    // Assert
    expect(result).toEqual({
      output1: 'expected1',
      output2: 100
    });
  });

  it('should throw error for invalid input', () => {
    // Arrange
    const invalidInput = { param1: '', param2: -1 };

    // Act & Assert
    expect(() => functionToTest(invalidInput)).toThrow('Invalid input');
  });

  it('should handle edge case correctly', () => {
    // Test boundary conditions
    const result = functionToTest({ param1: '', param2: 0 });
    expect(result).toBeNull(); // or appropriate expectation
  });
});
```

### B. Component Test Template (Real APIs, Frontend Components)

Use this for testing frontend components with user interactions and state management.

```typescript
/**
 * Component test for [Component Name].
 * Verifies [specific behavior] with user interactions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

// Mock external dependencies
vi.mock('./api', () => ({
  fetchData: vi.fn()
}));

const { fetchData } = await import('./api');

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render initial state correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should fetch and display data on mount', async () => {
    // Arrange
    const mockData = { id: 1, name: 'Test' };
    (fetchData as vi.Mock).mockResolvedValue(mockData);

    // Act
    render(<MyComponent />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(fetchData).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle user interactions correctly', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    // Act
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });

  it('should display error message on API failure', async () => {
    (fetchData as vi.Mock).mockRejectedValue(new Error('API Error'));

    render(<MyComponent />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });
});
```

### C. Component Test Template (Backend API Integration)

Use this for testing backend services that interact with external APIs.

```typescript
/**
 * Component test for [Service Name].
 * Verifies [specific behavior] using real API integration.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MyService } from './MyService';

describe('MyService', () => {
  let service: MyService;

  beforeAll(async () => {
    // Setup: Initialize service and test data
    service = new MyService({
      apiKey: process.env.TEST_API_KEY,
      baseUrl: process.env.TEST_API_BASE_URL
    });
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    await service.cleanupTestData();
  });

  it('should create and retrieve resource correctly', async () => {
    // Setup test data
    const createData = {
      name: 'Test Resource',
      value: 100
    };

    // Act: Create resource
    const created = await service.create(createData);

    // Assert: Verify creation
    expect(created).toHaveProperty('id');
    expect(created.name).toBe(createData.name);

    // Act: Retrieve resource
    const retrieved = await service.getById(created.id);

    // Assert: Verify retrieval
    expect(retrieved).toEqual(created);
  });

  it('should handle error cases gracefully', async () => {
    await expect(
      service.getById('nonexistent-id')
    ).rejects.toThrow('Resource not found');
  });
});
```

### D. Integration Test Template (End-to-End Workflows)

Use this for testing complete user workflows through multiple layers of the application.

```typescript
/**
 * Integration test for [Workflow Name].
 * Verifies the agent handles [scenario] correctly.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runIntegrationTest, createTestContext } from './test-helpers';

describe('User Workflow Integration Tests', () => {
  let testContext: TestContext;

  beforeAll(async () => {
    testContext = await createTestContext();
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  it('should complete full user registration flow', async () => {
    // Scenario: User registers, verifies email, sets up profile

    await runIntegrationTest({
      name: 'user-registration',
      testContext,

      // Define the workflow steps
      steps: [
        {
          action: 'register',
          input: {
            email: 'test@example.com',
            password: 'securePassword123'
          },
          assertions: [
            result => expect(response.status).toBe(201),
            result => expect(response.data).toHaveProperty('userId')
          ]
        },
        {
          action: 'verifyEmail',
          input: { token: 'verification-token' },
          assertions: [
            result => expect(response.data.verified).toBe(true)
          ]
        },
        {
          action: 'setupProfile',
          input: {
            name: 'Test User',
            preferences: { theme: 'dark' }
          },
          assertions: [
            result => expect(response.data.name).toBe('Test User')
          ]
        }
      ],

      // End-to-end validation
      finalValidation: async (context) => {
        const user = await context.db.getUserById(context.userId);
        expect(user.verified).toBe(true);
        expect(user.name).toBe('Test User');
      }
    });
  });
});
```

---

## 5. Standard Helpers & Tools

### Test Fixtures & Test Data Management

Create reusable test utilities for common setup/teardown operations:

```typescript
// src/tests/test-helpers/fixtures.ts

interface TestContext {
  db: Database;
  apiClient: ApiClient;
  cleanup: () => Promise<void>;
}

export async function createTestContext(): Promise<TestContext> {
  const db = createTestDatabase();
  const apiClient = createTestApiClient();

  return {
    db,
    apiClient,
    cleanup: async () => {
      await db.disconnect();
      await apiClient.close();
    }
  };
}
```

### Mock Helpers

```typescript
// src/tests/test-helpers/mocks.ts

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    createdAt: new Date(),
    ...overrides
  };
}

export function mockApiResponse<T>(data: T) {
  return {
    data,
    status: 200,
    success: true
  };
}
```

### Assertion Helpers

```typescript
// src/tests/test-helpers/assertions.ts

export function assertApiResponse(actual: any, expected: any) {
  expect(actual).toHaveProperty('success', true);
  expect(actual).toHaveProperty('data');
  expect(actual.data).toMatchObject(expected);
}

export function assertError(actual: any, expectedMessage: string) {
  expect(actual).toHaveProperty('success', false);
  expect(actual).toHaveProperty('error');
  expect(actual.error.message).toContain(expectedMessage);
}
```

---

## 6. Anti-Patterns (Do NOT Do This)

### ❌ BAD: Inline Test Setup

```typescript
// DON'T DO THIS
it('should do something', async () => {
  const db = await createDatabaseConnection(); // Slow!
  const user = await db.create({...});
  const token = await generateToken(user);
  const response = await api.post('/endpoint', { token });
  expect(response.status).toBe(200);
  await db.delete(user.id); // Easy to forget!
});
```

**✅ CORRECT**: Use test fixtures and helpers:

```typescript
it('should do something', async () => {
  const { apiClient, db } = testContext;
  const user = createMockUser();
  await db.insert(user);

  const response = await apiClient.post('/endpoint', user);

  expect(response.status).toBe(200);
  // Cleanup is automatic via testContext.cleanup()
});
```

### ❌ BAD: Implementation Testing

```typescript
// DON'T DO THIS
it('should call localStorage.setItem', () => {
  render(<MyComponent />);
  const setItemSpy = vi.spyOn(localStorage, 'setItem');
  // Testing implementation details instead of user behavior
  expect(setItemSpy).toHaveBeenCalledWith('key', 'value');
});
```

**✅ CORRECT**: Test user behavior:

```typescript
it('should save user preferences', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);

  await user.click(screen.getByRole('checkbox', { name: /dark mode/i }));

  // Verify the effect (preferences saved), not implementation
  expect(screen.getByText(/preferences saved/i)).toBeInTheDocument();
});
```

### ❌ BAD: Brittle Selectors

```typescript
// DON'T DO THIS
const button = document.querySelector('.submit-btn-primary.active');
// Breaks if CSS classes change
```

**✅ CORRECT**: Use accessible selectors:

```typescript
const button = screen.getByRole('button', { name: /submit/i });
// Resilient to styling changes
```

### ❌ BAD: Testing Private Methods

```typescript
// DON'T DO THIS
it('should validate email in private method', () => {
  const instance = new UserService();
  // Don't test private implementation details
  expect((instance as any).validateEmail('invalid')).toBe(false);
});
```

**✅ CORRECT**: Test public API behavior:

```typescript
it('should reject invalid email', async () => {
  const service = new UserService();
  await service.registerUser({ email: 'invalid' });
  // Test the public behavior, not private implementation
  await expect(service.getLastResult()).rejects.toThrow('Invalid email');
});
```

### ❌ BAD: Sleeps and Waits

```typescript
// DON'T DO THIS
it('should load data', async () => {
  render(<MyComponent />);
  await sleep(1000); // Flaky! Depends on network speed
  expect(screen.getByText('Data')).toBeInTheDocument();
});
```

**✅ CORRECT**: Use proper async expectations:

```typescript
it('should load data', async () => {
  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText('Data')).toBeInTheDocument();
  });
  // Or use findBy* methods with automatic waiting
  await expect(screen.findByText('Data')).toBeInTheDocument();
});
```

---

## 7. Directory Structure

```
src/
├── components/                # Source components
│   ├── MyComponent.tsx
│   └── __tests__/            # Co-located tests (optional)
│       └── MyComponent.test.tsx
├── tests/                    # Separate test directory
│   ├── unit/                 # Unit tests
│   │   ├── services/
│   │   │   └── UserService.test.ts
│   │   └── utils/
│   │       └── dateUtils.test.ts
│   ├── component/            # Component tests (backend/API)
│   │   └── api/
│   │       └── userApi.test.ts
│   ├── integration/          # Integration tests
│   │   ├── user-workflows.test.ts
│   │   └── e2e/             # End-to-end tests
│   │       └── registration.test.ts
│   └── test-helpers/        # Test utilities
│       ├── fixtures.ts
│       ├── mocks.ts
│       └── assertions.ts
└── e2e/                      # Browser E2E tests (Playwright/Cypress)
    └── user-flows.spec.ts
```

**Co-located vs Separate Test Directory:**

- **Co-located (`__tests__/` or `*.test.ts`)**: Best for component tests (frontend)
- **Separate (`src/tests/`)**: Best for unit and integration tests (backend/logic)
- **Follow project convention**: Be consistent with your project's existing structure

---

## 8. Test Coverage & Quality

### Coverage Goals

- **Unit Tests**: 80%+ coverage for critical business logic
- **Component Tests**: Cover all user interactions and error states
- **Integration Tests**: Cover critical user workflows
- **E2E Tests**: Cover happy paths and critical edge cases

### Coverage Tooling

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    }
  }
});
```

### Quality Checklist

- [ ] Tests are deterministic (no flaky tests)
- [ ] Tests run fast (avoid unnecessary sleeps)
- [ ] Tests are independent (can run in any order)
- [ ] Tests have clear descriptions (describe what they verify)
- [ ] Tests follow the ARRANGE-ACT-ASSERT pattern
- [ ] Tests use proper assertions (specific expectations, not just `any`)
- [ ] Tests handle edge cases
- [ ] Tests are easy to read and maintain
- [ ] Tests don't duplicate code (use helpers)

---

## 9. Running Tests

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test UserService.test.ts

# Run tests matching a pattern
npm test -- --grep "should create user"

# Run E2E tests
npm run test:e2e
```

### CI/CD Integration

Always run tests in CI/CD before merging:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3  # Upload coverage
```

---

## 10. Mocking Strategies

### When to Mock

- **DO Mock**: External APIs, databases, file system, network calls
- **DON'T Mock**: Pure functions, business logic, code you own and control

### Mocking Best Practices

```typescript
// Mock entire module
vi.mock('./api', () => ({
  fetchData: vi.fn()
}));

// Mock specific function
const mockData = { id: 1 };
vi.mocked(fetchData).mockResolvedValue(mockData);

// Mock implementation
vi.mocked(fetchData).mockImplementation(async (id: string) => {
  return API_DB[id] || null;
});

// Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

### Time Mocking

```typescript
import { vi } from 'vitest';

describe('Date handling', () => {
  it('should use current date', () => {
    const fixedDate = new Date('2025-12-26T00:00:00Z');
    vi.setSystemTime(fixedDate);

    const result = processDate();

    expect(result).toMatch(/2025-12-26/);

    vi.useRealTimers(); // Always restore
  });
});
```

---

## 11. Testing Checklist

### Before Committing

- [ ] All tests pass locally
- [ ] New code has test coverage
- [ ] No console errors in tests
- [ ] Tests are deterministic (run multiple times with same result)
- [ ] Tests run in isolation (no shared state between tests)
- [ ] Edge cases are covered
- [ ] Error states are tested
- [ ] Mocks are properly cleaned up

### Code Review - Testing

- [ ] Tests are readable and maintainable
- [ ] Tests follow project conventions
- [ ] No implementation details are tested (test behavior, not code)
- [ ] Tests have clear descriptions
- [ ] Tests are fast enough for the test layer
- [ ] Coverage is adequate for changes made

---

## 12. Debugging Failed Tests

### Common Issues & Solutions

**1. Test is Flaky (passes sometimes, fails sometimes)**
- Check for race conditions
- Remove arbitrary delays/sleeps
- Ensure proper async handling (await/waitFor)
- Check for shared state between tests

**2. Timer issues with async operations**
- Use `waitFor()` instead of `setTimeout`
- Configure reasonable timeout in test config
- Check for unhandled promise rejections

**3. Mock not applied**
- Ensure mock is before import
- Check `vi.mocked()` usage
- Verify mock is cleared between tests

**4. "Cannot find module" in tests**
- Check test setup (tsconfig paths, aliases)
- Verify test runner configuration
- Check file naming conventions

### Debugging Tools

```bash
# Run single test with verbose output
npm test -- --reporter=verbose UserService.test.ts

# Run tests with Node inspector (Chrome DevTools)
npm test -- --inspect-brk

# Debug specific test
npm test -- --run --reporter=verbose -t "test name"
```

---

## 13. Test Categories & Priorities

### Priority 1: Critical Tests (Must Pass)

- Core business logic
- User authentication flows
- Payment processing
- Security-critical operations
- Data integrity

### Priority 2: Core Features (Should Pass)

- Standard user workflows
- API endpoint functionality
- Component interactions
- Data transformation

### Priority 3: Edge Cases (Nice to Have)

- Error handling paths
- Boundary conditions
- Edge cases and odd inputs
- Performance characteristics

---

**Final Note**: Testing is a critical part of development, not an afterthought. Write tests as you write code, not after. A well-tested codebase is easier to maintain, refactor, and scale. Following this framework ensures consistency, reliability, and confidence in your codebase.
