# TypeScript Project Development Guidelines

This document outlines the general development guidelines for TypeScript projects. For project-specific guidelines, see [`PROJECT_GUIDELINES.md`](./PROJECT_GUIDELINES.md) or the equivalent module-level documentation.

## Core Principles

### 1. Testing

**Testing is paramount.** We follow a comprehensive testing strategy including Unit, Component, and Integration tests.

For detailed instructions, workflows, and debugging guides, please strictly refer to:
- **[`TS_TESTING_FRAMEWORK.md`](./TS_TESTING_FRAMEWORK.md)**: **The canonical guide for writing tests** - mandatory standards, templates, and anti-patterns
- **Project-level testing documentation**: Development workflow and testing philosophy
- **Integration testing documentation**: Advanced integration testing, debugging, and evaluation criteria

### 2. Functional Programming

We favor a functional style of programming, but we are not dogmatic about it. We emphasize the following principles:

- **Immutability**: We prefer to use immutable data structures (using `Readonly<T>`, `const`, and functional methods like `map`, `filter`, `reduce`)
- **Pure Functions**: We strive to write pure functions that have no side effects
- **Composition**: We favor composition over inheritance
- **Avoid Deep Nesting**: We avoid deep nesting of conditional logic and loops. We prefer early returns and guard clauses
- **Prevent Side Effects**: Use TypeScript's type system to enforce immutability where possible (e.g., `as const`, `ReadonlyArray`)

### 3. Code Style

We follow standard TypeScript/JavaScript conventions. We use ESLint and Prettier to automatically format our code and enforce a consistent style.

- **Clear and Self-Documenting**: We strive to write code that is clear and easy to understand without the need for excessive comments
- **Options Objects for Function Parameters**: For functions with more than a few parameters, we prefer to use a single options object to pass the parameters
- **Strong Typing**: Leverage TypeScript's type system to catch errors at compile time
- **Avoid `any`**: Use specific types; if you truly don't know the type, prefer `unknown` over `any`
- **Prefer Interfaces**: Use interfaces for object shapes that might be extended
- **Prefer Types**: Use `type` for unions, intersections, and more complex type compositions

### 4. End-to-End Requirement Validation

**Never declare success until the complete end-to-end user workflow is validated:**

- **Understand the Full Requirement**: Before starting, clarify the complete expected outcome from the user's perspective
- **Validate Each Phase**: For multi-step processes, ensure every phase of the user's journey works completely
- **Don't Stop at Partial Success**: Finding data is not the same as processing it correctly
- **Test the Full Lifecycle**: If the requirement is "create → list → update → delete", all phases must work before declaring success
- **Verify Through User's Eyes**: Success is measured by the user achieving their goal, not by individual components working

### 5. Refactoring

Refactoring is a critical third step in the TDD cycle. Once the tests are passing, we look for opportunities to improve the structure of the code without changing its external behavior.

- **The Rule of Three**: We only abstract when we have three or more instances of the same code
- **Semantic Meaning**: We only abstract when the code shares the same semantic meaning

### 6. Don't Repeat Yourself (DRY)

We focus on not duplicating **knowledge**, not just code. This means that we should not have the same piece of information in multiple places.

### 7. Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org). Each commit should represent a complete, working change.

- **Commit Message Format**:
  ```
  <type>[optional scope]: <description>

  [optional body]

  [optional footer(s)]
  ```
- **Example**:
  ```
  feat(auth): add password hashing and salting
  ```

**Common commit types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### 8. Continuous Documentation

We believe in **continuous documentation**. This means we keep all documentation files and related context up-to-date with our learnings and insights. Significant changes to logic, architecture, or developer workflow **must** be accompanied by a corresponding update to the relevant documentation file. Documentation is not an afterthought; it is part of the definition of 'done'. Always prioritize the hierarchical documentation strategy by placing documentation as close to the relevant code as possible.

#### Documentation Structure

To keep our documentation organized, we follow a hierarchical strategy:

- **Root `PROJECT_GUIDELINES.md`**: Contains project-wide principles and philosophies (like this one)
- **Module-level documentation**: Describes a major module's architecture (e.g., `src/AGENTS.md`)
- **Feature-level documentation**: Details the implementation of a specific feature (e.g., `src/auth/README.md`)
- **Workflow & Logic Files (`.md`)**: Explains complex business logic and lives next to the code it describes

#### Capturing Learnings

**Critical**: Whenever you solve a significant problem, discover an important pattern, or learn something valuable for future development, you **must** document it in the appropriate documentation file. This is not optional - it's essential for project knowledge retention.

**Learning Documentation is Mandatory:**
- ✅ Infrastructure fixes → `docs/learnings/INFRASTRUCTURE_FIXES.md`
- ✅ API integration patterns → `docs/learnings/API_PATTERNS.md`
- ✅ Testing strategies → `docs/learnings/TESTING_STRATEGIES.md`
- ✅ Workflow optimizations → `docs/learnings/WORKFLOW_IMPROVEMENTS.md`
- ✅ New patterns that solve recurring problems → appropriate file

**Quick Reference**:
- **Infrastructure/CI issues**: `docs/learnings/INFRASTRUCTURE_FIXES.md`
- **API patterns**: `docs/learnings/API_PATTERNS.md`
- **Testing strategies**: `docs/learnings/TESTING_STRATEGIES.md`
- **Workflow improvements**: `docs/learnings/WORKFLOW_IMPROVEMENTS.md`
- **Unsure**: Default to `docs/learnings/INFRASTRUCTURE_FIXES.md`

When adding new features or modules, please follow this structure to ensure our documentation remains consistent, discoverable, and maintainable. If you have a question that is not answered in the documentation, please ask, and then add the answer for the next person.

## TypeScript-Specific Guidelines

### Type Safety

- **Initialize Variables**: Always initialize variables with a type or value
- **Return Types**: Explicitly specify function return types for public APIs
- **Null Safety**: Use strict null checks (`strictNullChecks: true` in tsconfig.json)
- **Optional Chaining**: Use `?.` to safely access optional properties
- **Nullish Coalescing**: Use `??` for null/undefined fallbacks (not `||`)
- **Discriminated Unions**: Use discriminated unions for type-safe state management

### Interface vs Type

- **Use `interface` for**:
  - Object shapes that may be extended
  - Public API contracts
  - Class definitions

- **Use `type` for**:
  - Union types
  - Intersection types
  - Utility types (e.g., `Partial<T>`, `Pick<T>`)
  - Tuple types
  - Function types

### Error Handling

- **Never throw generic errors**: Always throw typed errors with context
- **Result Pattern**: Consider using the Result pattern for operations that can fail instead of throwing
- **Async Errors**: Always handle promise rejections with `.catch()` or try/catch in async functions

### Async/Await

- **Prefer async/await** over Promise chains for better readability
- **Promise.all**: Use `Promise.all()` for parallel operations
- **Promise.allSettled**: Use `Promise.allSettled()` when you need all operations to complete regardless of success/failure
- **Avoid `void`**: Never return `Promise<void>` unless necessary; prefer returning the actual result

## Code Organization

### File Structure

```
src/
├── components/         # Reusable UI components (if frontend)
├── services/           # Business logic and external service integrations
├── models/             # Data models and interfaces
├── utils/              # Utility functions and helpers
├── types/              # Shared type definitions
├── constants/          # Constants and configuration
├── tests/              # Test files (co-located or in a separate directory)
└── index.ts            # Public API exports
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `user-service.ts`)
- **Classes**: `PascalCase` (e.g., `UserService`)
- **Functions/Variables**: `camelCase` (e.g., `getUserById`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `API_BASE_URL`)
- **Interfaces**: `PascalCase` with optional `I` prefix for framework consistency (e.g., `IUser` or `User`)
- **Types**: `PascalCase` with `T` prefix for framework consistency (e.g., `TUser` or `User`)
- **Enum Members**: `PascalCase` (e.g., `UserRole.Admin`)

## Dependency Management

- **Install dependencies**: Use `npm install` or `yarn add`
- **Dev dependencies**: Use `npm install --save-dev` or `yarn add --dev` for types, testing tools, and build tools
- **Peer dependencies**: Only declare peer dependencies if your library is designed to work with a host package
- **Version pinning**: Use exact versions for critical dependencies (e.g., `package-lock.json` or checking in `yarn.lock`)

## Getting Started

1. **Read the Guidelines**: Start by reading this document to understand the project's core principles and documentation structure
2. **Set up the Development Environment**: Follow the project's README or setup guide for complete environment configuration
3. **Learn Testing Workflows**: For detailed testing strategies, command patterns, and debugging approaches, see [`TS_TESTING_FRAMEWORK.md`](./TS_TESTING_FRAMEWORK.md)
4. **Debugging Procedures**: When tests fail or you encounter issues, follow the debugging guide for systematic troubleshooting

## Adding New Functionality: A Step-by-Step Guide

When adding new functionality, follow this workflow:

1. **Understand the Requirement**: Clarify the complete expected outcome
2. **Design the Types**: Define interfaces and types first
3. **Write Tests First**: Write tests that fail (TDD approach)
4. **Implement the Feature**: Write the minimum code to pass the tests
5. **Refactor**: Improve the code structure once tests pass
6. **Update Documentation**: Document any learnings or patterns discovered
7. **End-to-End Validation**: Verify the complete user workflow works

## Security Considerations

- **Input Validation**: Never trust user input; validate and sanitize all data
- **Secrets Management**: Never commit secrets; use environment variables or secret managers
- **Dependency Updates**: Regularly update dependencies to patch security vulnerabilities
- **SQL Injection**: Use parameterized queries or ORMs
- **XSS Prevention**: Escape user-generated content before rendering
- **API Security**: Implement authentication, authorization, and rate limiting
- **Logging**: Never log sensitive data (passwords, tokens, PII)

## Performance Considerations

- **Lazy Loading**: Load code and resources on demand
- **Memoization**: Cache expensive computations
- **Debouncing/Throttling**: Rate-limit high-frequency operations (e.g., API calls)
- **Bundle Size**: Minimize bundle size using tree-shaking and code splitting
- **Optimization**: Profile and optimize bottlenecks rather than premature optimization
- **Memory Leaks**: Avoid memory leaks by cleaning up resources (event listeners, subscriptions)

## Code Review Checklist

Before submitting code for review, ensure:

- [ ] All tests pass
- [ ] Code follows the style guidelines (ESLint, Prettier)
- [ ] Types are defined and used correctly
- [ ] Error handling is in place
- [ ] Documentation is updated if needed
- [ ] No secrets or sensitive data is committed
- [ ] Commit messages follow the convention
- [ ] The feature works end-to-end
- [ ] Performance impact has been considered
- [ ] Security implications have been reviewed

---

*Consistently applying these guidelines will help maintain code quality, developer productivity, and project success.*
