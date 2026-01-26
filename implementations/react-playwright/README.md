# E2E Test Layer: React + Playwright + Hono

This directory contains the end-to-end test layer and the full-stack application implementation.

## 🏗 Architecture

- **Frontend**: React 19 + Vite + Zustand + Tailwind CSS
- **Backend**: Hono API (running in Vite during dev, standalone in prod)
- **Database**: SQLite with Drizzle ORM
- **Testing**: Playwright for E2E and API integration tests

## 🚀 Getting Started

```bash
# Install dependencies
pnpm install

# Start development server (Frontend + API)
pnpm run dev

# Run Playwright tests
pnpm test

# Run tests with UI
pnpm run test:ui
```

## 🧪 Testing Strategy

This layer focuses on verifying the **Integrated System Boundary**.

### API Integration Tests
Located in `src/test/api/`, these tests verify that the Hono API correctly implements the business rules defined in the pricing strategy.

### E2E GUI Tests
Located in `src/test/e2e/`, these tests verify the critical user journeys through the React application.

### Property-Based Testing (PBT)
We use `fast-check` to generate randomized test data for our API tests, ensuring that business invariants hold true across a wide range of inputs.

## 🛠 Project Structure

- `src/app/`: React application code
- `src/server/`: Hono API implementation
- `src/test/`: Playwright test suites
  - `api/`: API contract and integration tests
  - `e2e/`: End-to-end user journey tests
  - `builders/`: Test data builders
- `src/lib/`: Shared utilities and validation schemas
- `src/domain/`: Domain logic and pure functions