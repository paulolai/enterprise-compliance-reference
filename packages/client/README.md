# Frontend & API Layer

This package contains the React frontend and the Hono API implementation.

## 🏗 Architecture

- **Frontend**: React 19 + Vite + Zustand + Tailwind CSS
- **Backend**: Hono API (running in Vite during dev)
- **Shared**: Consumes types and schemas from `@executable-specs/shared`

## 🚀 Getting Started

```bash
# Start development server
pnpm run dev
```

## 🧪 Testing

This package contains unit tests for components and utilities.
**End-to-End (E2E) tests are located in the root `test/` directory.**

- **Unit Tests**: `pnpm test` (Vitest)
- **E2E Tests**: Go to root and run `pnpm run test:e2e`

## 🛠 Project Structure

- `src/components/`: React UI components
- `src/pages/`: Application pages
- `src/server/`: Hono API implementation (in-process for dev)
- `src/store/`: Zustand state management
