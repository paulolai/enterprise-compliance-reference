# Enterprise Reference: Completion & Pivot Plan

This document outlines the final steps to polish this repository as a comprehensive "Enterprise Reference" for compliance and rigorous engineering, before pivoting to a lean, AI-focused architecture in a new repository.

## 1. The Final Polish: "Modern Enterprise" Essentials

To ensure this repository stands as a high-quality portfolio piece for Staff/Principal engineering roles, we will add two critical "Modern Enterprise" features that are highly relevant to startups and scale-ups alike.

### A. Observability: OpenTelemetry (SigNoz Ready)
**Goal:** Demonstrate industry-standard distributed tracing without the complexity of legacy stacks.
**Value:** Shows capability to debug complex distributed systems.

**Implementation Plan:**
1.  **Instrument the Node.js Server:** Add `@opentelemetry/sdk-node` and auto-instrumentations (`@opentelemetry/auto-instrumentations-node`) to `packages/server`.
2.  **Trace Propagation:** Ensure trace IDs flow from the Hono API to the Domain logic and DB calls.
3.  **Docker Integration:** Create `docker-compose.observability.yml` to spin up a **SigNoz OTel Collector** and associated services (ClickHouse/Query Service) for full local visualization.
4.  **CI Validation strategy:** Configure a lightweight OTel collector in the CI pipeline that exports telemetry to a JSON file. Add a test step to parse this file and verify that expected metrics (e.g., `http_request_duration`) and traces were generated during the test run.
5.  **Middleware:** Add a Hono middleware to start/end spans for every request.

### B. API Contract: OpenAPI (Swagger)
**Goal:** Demonstrate "Contract-First" or "Code-First" API rigor.
**Value:** Proves ability to coordinate frontend/backend teams and enable AI agent discovery.

**Implementation Plan:**
1.  **Zod-to-OpenAPI:** Use `@hono/zod-openapi` to automatically generate the `openapi.json` spec from our existing Zod schemas in `packages/shared`.
2.  **Swagger UI:** Mount a `/doc` endpoint in `packages/server` to visualize the API.
3.  **Typed Clients:** Demonstrate (or document) how frontend clients would be generated from this spec.

---

## 2. Documented Gaps (The "Enterprise Noise" We Skip)

We explicitly acknowledge these patterns are standard in large enterprises but are omitted here to maintain portability and focus.

**Infrastructure & Operations**
*   **Kubernetes (K8s):** No Helm charts or manifests. We stick to Docker/Compose for portability.
*   **Terraform/IaC:** No cloud provisioning scripts. We assume a PaaS (Render/Railway) or container runtime.
*   **Secrets Management:** No HashiCorp Vault. We rely on standard `.env` injection.

**Security**
*   **OAuth2/OIDC:** We use a mock auth provider. Real enterprises use Okta/Auth0.
*   **WAF/DDOS Protection:** Handled at the infrastructure layer (Cloudflare), not code.

**Resilience**
*   **Circuit Breakers:** Not implemented for the mock Stripe service.
*   **Message Queues:** No RabbitMQ/Kafka for async processing (orders are synchronous for demo simplicity).

---

## 3. The Pivot: Strategy for the New Repo

Once the above are completed, this repository enters "Maintenance Mode". The new repository (`agent-trust-pattern` or similar) will fork *only* the essential logic.

**What We Keep (The Gold):**
*   `packages/domain`: The pure business logic.
*   `packages/shared`: The Zod schemas and types.
*   `docs/pricing-strategy.md`: The requirement source of truth.
*   `test/property-based`: The invariant tests.

**What We Leave Behind (The Enterprise Noise):**
*   The entire React Frontend (`packages/client`).
*   The Hono Server (`packages/server`) - replaced perhaps by a simple function handler or kept minimal.
*   Complex Docker/CI pipelines.
*   The "Shift Left" branding.

**New Focus:**
"How to use Invariant Tests to verify AI Agent output automatically."
