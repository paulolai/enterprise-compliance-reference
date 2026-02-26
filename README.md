# Engineering Interview Template

This repository is a scaffold for technical interviews focusing on enterprise-grade Node.js/TypeScript applications.

## 🏗 Project Structure

- `packages/domain`: Business logic, domain models, and unit tests (Vitest).
- `packages/server`: API layer (Hono/Express), database schema (Drizzle), and integration tests.
- `packages/shared`: Shared types and common utilities.
- `test`: E2E verification (Playwright).

## 🚀 Getting Started

1. **Install Dependencies:**
   ```bash
   pnpm install
   ```

2. **Setup Database:**
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

3. **Run Development Server:**
   ```bash
   pnpm run dev
   ```

4. **Run Tests:**
   ```bash
   pnpm run test
   ```

## 🛠 Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **API Framework:** Hono
- **Database:** SQLite with Drizzle ORM
- **Testing:** Vitest (Unit/Integration), Playwright (E2E)

## 🤖 AI Assistance

This repo is optimized for AI-assisted development. Refer to [CLAUDE.md](CLAUDE.md) for operational protocols and engineering guidelines.
