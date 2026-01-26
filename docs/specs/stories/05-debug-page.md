# Domain: Debug Index Page

## Business Standards

### Developer Experience

**For an ATDD/Executable Specifications repository:**

The debug pages are not for end users. They serve the development team by:

1. **Quick State Verification:** Developers can instantly see cart/user state
2. **Test Scenario Teleport:** Jump to specific test states without clicking through UI
3. **API Manual Testing:** Test endpoints directly from browser
4. **Educational Value:** Show how domain logic works visually

### Internal UX Principles

1. **Clear Visual Hierarchy:** Group related debug operations
2. **Scenario Descriptions:** Explain what each debug action does
3. **Links All Scenarios:** Single page to find all debug pages
4. **Safety Indicators:** Show when in debug/development mode

### Why This Matters

- **Developer Velocity:** Slow state setup makes tests painful
- **Onboarding:** New developers need easy way to explore system
- **Demo Purposes:** Quickly showcase different cart/user states
- **Debug Integration:** Verify API and UI are correctly connected

---

## Domain Concepts

### Core Entities

| Entity | Attribute | Description |
|--------|-----------|-------------|
| **Debug Scenario** | `name` | Human-readable scenario name |
| | `description` | What the scenario demonstrates |
| | `endpoint` | API endpoint to trigger |
| | `parameters` | Payload for the API call |
| **Debug Page** | `route` | URL path |
| | `components` | Visual components shown |
| | `actions` | Available debug actions |

### Existing Debug Pages

| Page | Route | Purpose |
|------|-------|---------|
| Cart Debug | `/debug/cart-view` | Visual debugging for cart states |
| Checkout Debug | `/debug/checkout` | Checkout flow debugging |

### Existing Debug APIs

| API | Method | Purpose |
|-----|--------|---------|
| `/api/debug/seed-session` | POST | Set cart state to predefined scenario |
| `/api/debug/seed-auth` | POST | Set current user to demo user |
| `/api/debug/reset` | POST | Clear all state (cart, user) |
| `/api/debug/state` | GET | Get current debug state |

### Ubiquitous Language

| Term | Definition |
|-------|------------|
| "Debug teleport" | Jump directly to a test state without UI interaction |
| "Debug seed" | Pre-populate state for testing/demonstration |
| "Debug index" | Navigation page listing all debug scenarios |

### Invariants

1. **Debug Mode Only:** All debug pages/APIs should be disabled in production
2. **Clear State Reset:** Reset must clear ALL state (cart, user, session)
3. **Valid Scenarios:** All seeded scenarios must be valid states
4. **Read-Only Safe:** Debug GET endpoints cannot modify state

---

## Workflow

### Debug Index Page Usage

```
1. Developer opens /debug
   └─ Sees list of all debug scenarios

2. Developer selects scenario
   ├─ "Show cart with bulk discount items"
   └─ Debug page opens with that state

3. Developer can:
   ├─ View state visually
   ├─ Test API calls
   └─ Teleport to different scenarios
```

### Debug Scenario Workflow

```
1. User clicks "Apply Scenario" button
   └─ Calls the seed-session endpoint

2. Seed endpoint processes:
   ├─ Clears existing state
   ├─ Applies predefined cart/user state
   └─ Returns new state

3. UI updates to reflect new state
   └─ Cart badge updated
   └─ User profile updated
   └─ Pricing recalculated
```

---

## Scenario Mapping

| Scenario | Description | API Call |
|----------|-------------|----------|
| **Empty cart** | Fresh start, no items | seed-session with empty items |
| **New customer** | First-time buyer | seed-auth: "new" user |
| **VIP customer** | 3+ year tenure | seed-auth: "VIP" user |
| **Bulk discount items** | 3+ same SKU | seed-session: items with quantity 3+ |
| **Free shipping threshold** | Cart > $100 | seed-session: items totaling >$100 |
| **Complex cart** | Multiple SKUs, VIP | seed-session: varied items + VIP |
| **Standard shipping** | Any amount under threshold | seed-session: under $100 |
| **Express shipping** | Fixed rate scenario | seed-session: any items + Express |
| **Reset state** | Clear everything | POST /api/debug/reset |

### Test Scenarios for Development

These are the most useful scenarios for development/testing:

1. **Happy path:** VIP user with bulk discount → Free shipping
2. **New user:** No discounts → Standard shipping
3. **Edge case:** Exactly $100 → No free shipping
4. **Maximum discount:** Bulk + VIP = 30% cap hit
5. **Express override:** Any cart with Express = $25

---

## Test Specifications

### E2E Tests (Already Exists)

**Location:** `implementations/react-playwright/src/test/e2e/debug-index-page.ui.spec.ts`

| Test | Description |
|------|-------------|
| Index page loads | Page renders without errors |
| Shows all debug scenarios | All scenarios listed with descriptions |
| "Apply Scenario" button works | Clicking applies the scenario |
| Reset button works | Clear all state button functions |
| Cart state updated | After scenario, cart reflects new state |
| User state updated | After scenario, user reflects new state |
| Links to other debug pages | Navigation links work correctly |

---

## Technical Implementation

### Where the Code Lives

| Component | Location | Status |
|-----------|----------|--------|
| Debug Index Page | `implementations/react-playwright/src/pages/debug/DebugIndexPage.tsx` | ✅ Complete |
| Debug Routes | `implementations/react-playwright/src/server/routes/debug.ts` | ✅ Complete |
| Cart Debug Page | `implementations/react-playwright/src/pages/debug/CartDebugPage.tsx` | ✅ Complete |
| Checkout Debug Page | `implementations/react-playwright/src/pages/debug/CheckoutDebugPage.tsx` | ✅ Complete |
| E2E Tests | `implementations/react-playwright/src/test/e2e/debug-index-page.ui.spec.ts` | ✅ Complete |

### Debug Index Page Structure

```tsx
// /debug/index.tsx
export default function DebugIndexPage() {
  const scenarios = [
    {
      name: "Empty Cart",
      description: "Fresh start, cart has no items",
      endpoint: "/api/debug/seed-session",
      payload: { items: [] },
    },
    {
      name: "New Customer",
      description: "First-time buyer, no discounts",
      endpoint: "/api/debug/seed-auth",
      payload: { userType: "new" },
    },
    {
      name: "VIP Customer",
      description: "3+ year tenure, 5% discount",
      endpoint: "/api/debug/seed-auth",
      payload: { userType: "VIP" },
    },
    // ... more scenarios
  ];

  return (
    <div className="debug-index">
      <h1>Debug Index</h1>
      {scenarios.map(s => (
        <ScenarioCard key={s.name} scenario={s} />
      ))}
      <ResetButton />
    </div>
  );
}
```

### Existing Debug API Endpoints

**Seed Session:**
```
POST /api/debug/seed-session

Request:
{
  items?: Array<{
    sku: string;
    quantity: number;
    priceInCents: number;
    weightInKg: number;
  }>;
  shippingMethod?: ShippingMethod;
}

Response:
{
  success: boolean;
  state: DebugState;
}
```

**Seed Auth:**
```
POST /api/debug/seed-auth

Request:
{
  userType: 'new' | 'regular' | 'VIP' | 'goldmember';
}

Response:
{
  success: boolean;
  user: User;
}
```

**Reset:**
```
POST /api/debug/reset

Response:
{
  success: boolean;
  state: DebugState;  // Empty state
}
```

**Get State:**
```
GET /api/debug/state

Response:
{
  cart: CartItem[];
  user: User | null;
  shippingMethod: ShippingMethod;
  pricingResult: PricingResult | null;
}
```

---

## Completion Criteria

This domain is complete when:

- [ ] Debug index page created at `/debug`
- [ ] All debug scenarios listed with descriptions
- [ ] "Apply Scenario" buttons work for each scenario
- [ ] Reset button clears all state
- [ ] Links to existing debug pages (Cart, Checkout)
- [ ] E2E tests for debug index page pass
- [ ] Attestation reports show coverage
- [ ] Page clearly marked as "Debug/Development Only"

---

## References

- `DEEP_DOMAIN_UNDERSTANDING.md` - Methodology
- Existing debug pages for pattern reference
