# Philosophy & Rationale

## The Problem We Solve

"Shift Left" initiatives usually fail because organizations ask developers to do "QA Work"—writing Gherkin scripts, taking manual screenshots, and filling out Word documents for ServiceNow.

Engineers also struggle to write tests that verify **behaviour** rather than **implementation details**—they end up testing *how* the code works instead of *what* it achieves.

**The only way to make Shift Left work in regulated environments:** Stop asking developers to be testers and start enabling them to do testing using their native tools.

This requires **Developer-Native Compliance**: tools that automate the bureaucracy so engineers can focus on code.

## The Solution: Signals over Silos

We eliminate the "Translation Layer Tax" and the "Manual Attestation Tax." Instead of separate QA artifacts, we generate **Regulatory-Grade Evidence** as a direct side effect of standard engineering practices.

### 1. Automated Attestation (Visual Evidence)

Every test run generates a self-contained **Attestation Report** designed for auditors, not just developers. It maps every execution back to the original business requirement in `pricing-strategy.md`.

### 2. The Code: Gherkin vs. Executable Specs

Stop writing fragile strings. Use Type-Safe Test Data Builders.

The reality is that **non-engineers rarely read feature files**—the supposed "ubiquitous language" ends up being read only by the engineers who wrote it.

| The "Gherkin Tax" (Legacy) | The "Executable Spec" (This Repo) |
| :--- | :--- |
| **Fragile Strings:** `Given I have 5 items` | **Type-Safe Code:** `CartBuilder.new().withItem({ name, price, quantity: 5 })` |
| **Manual Math:** You calculate expected values | **Invariants:** The machine proves the rule holds |
| **Zero IDE Support:** Rename requires find/replace | **Full IDE Support:** Refactor with confidence |
| **Semantic Drift:** Feature files diverge from code | **Semantic Integrity:** The code *is* the spec |

**Legacy Gherkin (Maintenance Burden):**
```gherkin
Scenario Outline: Bulk discount
  Given I have a cart with items:
    | sku | qty | price |
    | IPAD | <qty> | 1000 |
  Then the volume discount is <bulk_discount>
  # PAIN: You must manually calculate every row!
  Examples:
    | qty | bulk_discount |
    | 3   | 450           |
    | 10  | 1500          |
```

**Executable Spec (Developer Native):**
```typescript
export function verifyInvariant(metadata: InvariantMetadata, assertion: AssertionCallback) {
  fc.assert(
    fc.property(cartArb, userArb, (items, user) => {
      const result = PricingEngine.calculate(items, user);
      tracer.log(testName, { items, user }, result);
      assertion(items, user, result);
      return true;
    })
  );
});

// Using the helper - the invariant is proven across 100 random cart/users
it('Invariant: Final Total is always <= Original Total', () => {
  verifyInvariant({
    ruleReference: 'pricing-strategy.md §1',
    rule: 'Final Total must never exceed Original Total (prices never increase)',
    tags: ['@pricing', '@base-rules', '@revenue-protection']
  }, (_items, _user, result) => {
    expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
  });
});
```

## The 3 Pillars of Developer-Native Compliance

### 1. Zero-Tax Verification (The Google Lesson)

**The Problem:** Traditional QA processes slow developers down with context switching and manual data entry.

**The Solution:** At **Google**, Engineering Productivity (EngProd) tools served the engineer, not the process. We replace the "Gherkin Tax" with **Type-Safe Test Data Builders**, ensuring testing is a high-speed feedback loop that feels like coding, not bureaucracy.

### 2. Continuous Attestation (The CBA Lesson)

**The Problem:** In regulated industries like banking, shipping features is blocked by manual evidence gathering (screenshots, Word docs).

**The Solution:** We generate **Regulatory-Grade Evidence** as a direct side-effect of the CI/CD pipeline. Every test run produces two distinct artifacts:
- **Attestation Report**: A business-readable audit trail linking execution back to `pricing-strategy.md` for compliance officers.
- **Allure Report**: A technical dashboard for engineers to track flakiness and trends.

### 3. Autonomous Quality (The Scalability Lesson)

**The Problem:** Human testers (and developers) inevitably miss edge cases. Writing enough examples to cover every scenario is impossible.

**The Solution:** We move from "Example-Based Testing" to **Property-Based Testing (PBT)**. Instead of writing 50 separate test cases, we define a single **Invariant** (e.g., "Discount never exceeds 30%"). The machine then generates hundreds of randomized scenarios—negative numbers, massive quantities, distinct user types—proving the rule holds universally.

## Origin Story

This project is a public recreation of the work delivered as **Commonwealth Bank's first Staff Quality Engineer**, synthesizing lessons from 20+ years including years at **Google** and high-growth startups.

It solves a specific, painful problem found in enterprises:
- **The Pain:** Developers blocked by manual evidence gathering and fragile automation.
- **The Solution:** A Reference Architecture that delivers **Bank-grade compliance with Google-grade velocity.**
