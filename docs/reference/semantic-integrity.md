# Reference: Semantic Integrity (Type Safety)

**The Google Standard: "If it doesn't compile, it's not code."**

> *Preventing Semantic Drift with Compiler-Grade Verification.*

## Overview
**Semantic Drift** is the silent killer of Gherkin test suites. It occurs when the Feature File (English) and the Production Code (Logic) slowly diverge over time because they are only loosely coupled by Regex. 

The test passes, but the documentation is a lie.

This page explains how **Type Safety** in Executable Specifications eliminates this risk entirely, enforcing what we call **Semantic Integrity**.

## The Problem: The Zombie Test

In Gherkin, you might have:
*   **Feature:** `Then the bulk discount is 450`
*   **Step Def:** `Then(/^the (.*) discount is (\d+)$/, ...)`
*   **Code:** `result.bulkDiscount = 450`

If a developer renames `bulkDiscount` to `volumeDiscount` in the code, but forgets to update the Feature file:
1.  They update the Step Definition to read `result.volumeDiscount`.
2.  The Regex `(.*) discount` still matches "bulk discount" from the Feature file.
3.  **The Test Passes.**
4.  **The Documentation is Wrong.** The Feature file says "bulk," the code says "volume."

This is a **Zombie Test**. It looks alive (green), but it's dead inside. It misrepresents reality.

## The Solution: Compiler as Gatekeeper

In the Reference Architecture, there is no loose coupling. The test imports the *actual types* from the production code.

```typescript
// Production Code
interface PricingResult {
  volumeDiscount: number; // Renamed from bulkDiscount
}

// Test Code
it('verifies discount', () => {
  const result = engine.calculate(...);
  
  // COMPILER ERROR: Property 'bulkDiscount' does not exist on type 'PricingResult'.
  // Did you mean 'volumeDiscount'?
  expect(result.bulkDiscount).toBe(450); 
});
```

The test **cannot run** until it is semantically aligned with the code.

### The "F2" Rename Factor
When you use `F2` (Rename Symbol) in VS Code:
1.  You rename the property in the source.
2.  The IDE automatically updates *every usage* in the test files.
3.  Documentation (in the form of type definitions) and Verification (tests) stay perfectly in sync.

## Professional Integrity
As engineers, we cannot accept tools that allow us to ship lies. 
*   **Gherkin structurally permits Semantic Drift.**
*   **TypeScript structurally prevents it.**

Choosing Type Safety is a choice for professional integrity. It ensures that your test suite remains a truthful representation of your system's behavior at all times.
