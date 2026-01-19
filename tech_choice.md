To create the ultimate **"Teaching Sandbox"**—where the infrastructure disappears and the ATDD lesson shines—you should standardise on a full-stack TypeScript environment. This minimises context switching for your students.

Here is the **"Principal's Choice"** stack for 2026. It prioritises **Zero-Config** and **Clone-and-Run** simplicity.

### The "Clean Room" Teaching Stack

| Layer | Technology | Why for Teaching ATDD? |
| --- | --- | --- |
| **Frontend** | **Vite + React** | Instant feedback loops. No "Server Component" confusion. |
| **UI Lib** | **shadcn/ui** | Accessible code that lives in your repo (not `node_modules`). |
| **Backend** | **Hono** | The modern replacement for Express. Ultra-light, standards-based, and typesafe. |
| **Database** | **SQLite + Drizzle** | **Crucial.** It's just a file. No Docker required. Students run `npm start` and it works. |
| **Shared** | **Zod** | Validate inputs on the frontend *and* backend with one schema. |
| **Testing** | **Vitest + Playwright** | The "Double Loop" engines. |

---

### Why this specific backend (Hono + Drizzle)?

#### 1. Hono is the "Feynman" of Backends

Express is legacy; NestJS is bloat. Hono is pure simplicity.
It lets you teach the concept of an API without boilerplate.

```typescript
// api/index.ts
const app = new Hono()

app.get('/users', (c) => {
  return c.json({ users: [] })
})

```

This is readable by a junior, but robust enough for a principal.

#### 2. SQLite removes the "DevOps Wall"

Nothing kills a workshop faster than "Okay everyone, install Docker so we can spin up Postgres."
With **SQLite** (via `better-sqlite3`), the database is just a file in the repo. You can commit a "seed" database so every student starts with the exact same data state.

#### 3. Drizzle allows "Type-Safe Contracts"

Drizzle ORM lets you define your DB schema in TypeScript.

* **The Lesson:** You can import the *backend* types directly into your *frontend* mocks.
* **The Win:** If you change the database schema, your MSW mocks turn red (type error). This teaches **Systemic Type Safety**.

### The Architecture: "The Monolith of Truth"

Structure your repo as a lightweight monorepo (using pnpm workspaces or just standard folders).

```text
/my-atdd-workshop
├── /src
│   ├── /components   # shadcn/ui components
│   ├── /server       # Hono API (The "Backend")
│   ├── /db           # Drizzle Schema & SQLite file
│   └── /mocks        # MSW Handlers (The "Contract")
├── /tests
│   └── /e2e          # Playwright (The "Outer Loop")
└── package.json

```

### How to Teach the "Hybrid" Mocking Strategy here

1. **Frontend Tests (Vitest):**
* Mock the *Internal* Hono API using **MSW**.
* Mock the *External* Payment Gateway using **colocated MSW handlers**.


2. **Backend Tests (Vitest):**
* Test the Hono routes directly.
* Mock the *External* Payment Gateway using **Playwright HAR** (yes, you can use HARs for backend integration tests too, or use `msw/node` to intercept the backend's outgoing HTTP calls).


3. **E2E Tests (Playwright):**
* Spin up the full Hono server + Frontend.
* Use **HAR Replay** for the external Payment Gateway only.



# More about the network mocking

As a Principal Engineer, you need to draw a hard line between **"Domain Logic"** (stuff you control/build) and **"Integration Boundaries"** (stuff you consume/survive). Applying "Hand-Written Mocks" to a Stripe/Salesforce API is a waste of life—you will get the schema wrong, and your tests will pass while production fails.

Here is the architectural pattern for the "Mix" you are describing.

### The Strategy: "The Split Brain"

You split your mocking strategy based on **Ownership**:

| Category | Definition | Strategy | Tool |
| --- | --- | --- | --- |
| **Internal (New)** | APIs *you* are building. | **Contract-First (ATDD).** Write the mock manually to define the spec before the backend exists. | **MSW** (Hand-coded) |
| **External (3rd Party)** | APIs *others* control (Stripe, Auth0). | **Record & Replay.** Treat the API as a black box. Record the real dev environment once, then replay forever. | **Playwright HAR** |

### 1. The Solution for External Endpoints: Playwright HAR

You do not need a new tool. Playwright has a native "VCR" built-in called **HAR (HTTP Archive)**. It is robust, standard, and maintenance-free.

**How it works in your ATDD flow:**

1. You run the test *once* with a flag (e.g., `UPDATE_HAR=true`).
2. Playwright hits the **Real External Dev Env**.
3. It saves the traffic to `payment-gateway.har` (a standard JSON file).
4. Future runs intercept the network request and serve the HAR file.

**The Code (Playwright):**

```typescript
// tests/checkout.spec.ts
test('processes payment via Stripe', async ({ page }) => {
  // "The Time Machine" - Record once, replay forever
  await page.routeFromHAR('tests/hars/stripe-success.har', {
    url: 'https://api.stripe.com/**', 
    update: process.env.UPDATE_HAR ? true : false, // The toggle
  });

  await page.goto('/checkout');
  await page.getByRole('button', { name: /pay/i }).click();
  
  await expect(page.getByText('Payment Successful')).toBeVisible();
});

```

* **Why this wins:** You maintain **Zero Mocks**. If the Payment Gateway changes their API, you don't rewrite 50 lines of JSON. You just delete the `.har` file and re-run the test once against the Dev Env.

### 2. The Solution for Component Tests (Vitest)

This is where most teams mess up. They try to install a separate recorder for Node (like Polly.js). **Don't do that.** It creates two sources of truth.

For your Unit/Component tests, you have two "Principal-Grade" options:

**Option A: The "Integration Push" (Recommended)**
Push the testing of external integrations *up* to Playwright.

* *Rule:* If the component talks to Stripe directly, test it in Playwright with `routeFromHAR`.
* *Why:* Unit tests are for logic you own. You don't own the Stripe handshake.

**Option B: The "HAR Recycle" (Advanced)**
If you *must* unit test a component that hits an external API, **feed the Playwright HAR into MSW.**
Since a HAR file is just JSON, you can write a tiny utility to read it. This ensures your Unit Tests and E2E tests share the **exact same** snapshot of reality.

```typescript
// src/mocks/handlers.ts
import stripeHar from '../../tests/hars/stripe-success.har'; // Import the Playwright recording

export const handlers = [
  // Manual mocks for YOUR new API (ATDD)
  http.get('/api/my-new-feature', () => HttpResponse.json({ ... })),

  // "Recycled" recording for External API
  http.post('https://api.stripe.com/v1/charges', () => {
    // Serve the response from the Playwright HAR
    return HttpResponse.json(stripeHar.log.entries[0].response.content); 
  })
];

```

### Summary of the Lesson Plan

1. **For the "New Feature" (User Profile):** Teach students to write **MSW Handlers** manually. This teaches API Design and Contract Testing.
2. **For the "External Service" (Payment):** Teach students to use **Playwright `routeFromHAR**`. This teaches resilience and "Integration vs. Implementation."

### Next Step

I can provide the **simple TypeScript utility function** that parses a standard HAR file and converts it into an MSW handler. This allows you to "Import" your Playwright recordings directly into your Vitest suite, bridging the gap perfectly.

[Why MSW's New Interception Method is a Game-Changer for Developers](https://www.youtube.com/watch?v=sZX6Cf6iKKs)
*This video explains the internal "Interceptors" architecture of MSW, which is useful context for understanding how to layer manual mocks alongside recorded HAR data without conflicts.*