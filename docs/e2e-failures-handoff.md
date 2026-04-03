# E2E Test Failures — Handoff Document

**Date:** 2026-04-03  
**Status:** ✅ RESOLVED — All 175 E2E/API tests passing

---

## Current Test Status

| Suite | Status | Count |
|-------|--------|-------|
| Domain tests | ✅ | 156 passed, 1 skipped |
| Client tests | ✅ | 10 passed |
| E2E + API tests | ✅ | 175 passed |
| TypeScript | ✅ | 0 errors (5 packages) |

**Full suite:** `pnpm run test:all` — all passing with attestation report generated.

---

## Quick Reference

| Topic | Location |
|-------|----------|
| **OTel Observability** | `docs/OTEL_GUIDE.md` |
| **E2E Resolution Archive** | `docs/archive/e2e-failures-handoff-2026-04-03.md` |
| **Form Validation Archive** | `docs/archive/session-handoff-2025-03-17.md` |
| **OTel Migration Archive** | `docs/archive/review-handoff-otel-migration.md` |
| **Workflow Guide** | `docs/WORKFLOW_GUIDE.md` |

---

## Architecture Notes

### Dev Server Architecture

```
┌─────────────────┐     proxy      ┌──────────────────┐
│  Vite Dev       │ ──────────────→│  Hono API        │
│  localhost:5173  │  /api/*        │  localhost:3000   │
│  (client only)  │  /health       │  (server only)    │
└─────────────────┘  /readyz       └──────────────────┘
                    /livez
                    /metrics
```

- Client bundle: Pure browser code (React, Zod, Zustand)
- Server bundle: Pure Node.js code (better-sqlite3, drizzle-orm, OTel)
- No cross-contamination between bundles

### OTel Pipeline

```
Playwright Test Worker
  ↓
invariant() wrapper → emitInvariantSpan()
  ↓
InvariantSpanProcessor aggregates
  ↓
Persists to /tmp/vitest-otel-data/summaries-playwright-{pid}.json
  ↓
Attestation Reporter merges all worker files
  ↓
Unified attestation report
```

---

## SigNoz Stack

**Quick Start:**
```bash
# Start observability stack (requires podman + podman-compose via uv)
CONTAINERS_REGISTRIES_CONF=.containers/registries.conf \
  podman-compose -f docker-compose.observability.yml up -d

# Run app with OTel export
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 pnpm run dev:backend

# View UI at http://localhost:3301
```

| Service | Port | Status |
|---------|------|--------|
| otel-collector | 4317, 4318 | ✅ Running |
| clickhouse | 9000, 8123 | ✅ Healthy |
| query-service | 8080 | ✅ Running |
| frontend | 3301 | ✅ Running |

---

## Recent Commits

```
2457bb6 fix: SigNoz OTel collector config and add uv tooling docs
f3be935 docs: add CI flakiness fixes to handoff document
1a01036 fix: E2E test isolation and OTel shutdown race conditions
dba51dd docs: update handoff with E2E OTel integration completion
b092284 fix: E2E/Playwright OTel integration and browser bundle contamination
```

---

## Key Lessons

1. **`@hono/vite-dev-server` is dangerous** — Pulls server module graph into browser. Use `server.proxy` instead.
2. **Barrel exports must be browser-safe** — Use `index-server.ts` for Node-only exports.
3. **Rate limiting needs explicit opt-out** — Set `NODE_ENV=test` in CI/test environments.
4. **`util5.inherits is not a function`** = Node.js module leaked into browser bundle.
5. **Use `uv` for Python tooling** — `uv tool install podman-compose` for container management.

---

## Archived Documents

Historical documents moved to archive:

| Original Location | Archive Location | Description |
|-------------------|------------------|-------------|
| `exploratory-testing-report*.md` | `/archive/` | Round 1-3 exploratory testing reports (2026-03-17) |
| `PRODUCTION_READY_PLAN.md` | `/archive/` | Completed production readiness plan |
| `ENTERPRISE_COMPLETION_PLAN.md` | `/archive/` | Completed enterprise completion plan |
| `HEALTHTECH_DEMO_PLAN.md` | `/archive/` | HealthTech demo concept |
| `DRIFT_DETECTION_PLAN.md` | `/archive/` | Completed drift detection plan |
| `AI_PATTERN_BLUEPRINT.md` | `/archive/` | Early AI pattern concepts |
| `AGENTS_HEALTHTECH_TODO.md` | `/archive/` | HealthTech-specific tasks |
| `STAKEHOLDER_GUIDE.md` | `/archive/` | Superseded by `docs/STAKEHOLDER_GUIDE.md` |
| `CLAUDE.md` | `/archive/` | Empty placeholder |
| `docs/SESSION_HANDOFF_2025-03-17.md` | `docs/archive/` | Form validation handoff (completed) |
| `docs/review-handoff-otel-migration.md` | `docs/archive/` | OTel migration review (completed) |
| `docs/e2e-failures-handoff-2026-04-03.md` | `docs/archive/` | Full E2E resolution history |

---

*For full historical context, see archived handoffs in `docs/archive/` and `/archive/`*
