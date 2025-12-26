# The Gherkin Tax: Why We Stopped Translating Code to English (and Started Proving It Instead)

For the last decade, the software industry has been paying a tax. 

It’s called the **Translation Tax**.

We convinced ourselves that if we wrote our tests in "Plain English" using Gherkin (`Given/When/Then`), our Product Managers would read them, our stakeholders would validate them, and we would achieve the holy grail of "Shared Understanding."

We were wrong. But before we tear it all down, let's make one thing clear.

## BDD is the Goal. Gherkin is the Trap.

**We love Behavior-Driven Development (BDD).** 

The core philosophy of BDD is timeless: *Define the behavior of the system before you implement it.* The idea of "Executable Acceptance Criteria"—tests that double as requirements—is the gold standard of software engineering. It forces collaboration, clears up ambiguity, and defines "Done."

But somewhere along the way, we confused the **Philosophy** (BDD) with the **Syntax** (Gherkin).

We started believing that to do BDD, you *had* to write text files. You *had* to use regex. You *had* to maintain a separation between the spec and the code.

**That is the Gherkin Trap.** It turns a beautiful philosophy into a maintenance nightmare. We don't need to kill BDD; we need to save it from the "Translation Layer" that is suffocating it.

## The Problem: You're Maintaining a Bad Implementation of English

Traditional Gherkin-based BDD forces you to build a Rube Goldberg machine:

1.  **The Intent:** "Users get a discount."
2.  **The Feature File:** `Given a user with type "VIP"...` (String)
3.  **The Step Definition:** `/^a user with type "(.*)"$/` (Regex)
4.  **The Glue:** `this.user = ...` (Shared Mutable State)
5.  **The Code:** `pricing.calculate(user)`

If you want to rename "VIP" to "Gold Tier", you can't just press F2 in your IDE. You have to `Ctrl+F` through text files, update regex patterns, and pray you didn't miss a space character.

**In our analysis, a simple refactor that takes 1 second in TypeScript takes 10+ minutes in a Gherkin-based project.**

## The Solution: Executable Specifications

We stopped trying to make our **Input** (the test code) look like English. Instead, we focused on making our **Output** (the evidence) irrefutable.

We call this pattern **Executable Specifications**. It fulfills the promise of BDD—requirements that run—without the tax.

### 1. Fluent Builders (Readability for Engineers)
Don't write strings. Write code that reads *like* a specification but compiles *like* a program.

```typescript
// No regex. No magic strings. Full IDE auto-complete.
const result = CartBuilder.new()
  .withItem('MacBook Pro', 500000, 1)
  .withExpeditedShipping()
  .calculate();
```

### 2. Property-Based Testing (Mathematical Proof)
Gherkin relies on "Examples." *Given I buy 3 iPads, the price is X.* 
That’s one data point. What if I buy 0 iPads? Or 5,000?

We use **Invariants** to prove business rules hold for *all* possible inputs.

```typescript
// "The Safety Valve Rule"
// Proves that NO MATTER what is in the cart, the discount NEVER exceeds 30%.
it('Invariant: Total Discount strictly NEVER exceeds 30%', () => {
  fc.assert(fc.property(cartArb, userArb, (items, user) => {
    const result = PricingEngine.calculate(items, user);
    expect(result.totalDiscount).toBeLessThanOrEqual(result.originalTotal * 0.30);
  }));
});
```
This single test generates 1,000 different scenarios every time it runs. It finds bugs no human would think to write a Gherkin scenario for.

### 3. The Attestation Report (Trust for Stakeholders)
Since stakeholders don't read code (and honestly, they don't read feature files either), we generate what they *do* want: **A Receipt.**

Our system produces a high-fidelity **Attestation Report** (HTML/Markdown) after every CI run. It logs the exact inputs, the exact outputs, and the mathematical proof that the rules were followed. 

*   **Stakeholders** see the logic is sound.
*   **Auditors** see the trace logs.
*   **Engineers** see green tests.

## We Built Both: A Side-by-Side Comparison

To prove this isn't just theory, we built the **exact same Pricing Engine** twice in this [demo repository](https://github.com/paulo-lai/executable-specs-demo).

### ❌ The Anti-Pattern (`implementations/typescript-cucumber`)
We built a standard Gherkin implementation. It has 27 scenarios, regex step definitions, and "Glue Code." 
*   **Experience:** Painful. We added comments in the code highlighting exactly where the "Translation Tax" hits hardest.
*   **Refactoring:** A nightmare.

### ✅ The Solution (`implementations/typescript-vitest`)
We built the Executable Specs version using Vitest and fast-check.
*   **Experience:** Fast. Type-safe. Clean.
*   **Coverage:** 47 tests proving 1,000s of permutations.
*   **Refactoring:** Instant.

## Stop Lying to Yourself

Collaboration happens in conversation, not in `.feature` files. Stop wishing your Product Owner will review your regex.

*   **Keep the BDD philosophy:** Collaborate, define behavior, verify results.
*   **Tear down the translation layer:** Stop simulating English.
*   **Generate evidence:** Give stakeholders the receipt they actually need.

Code is the only artifact that compiles. Make it your specification.

---

**See the code for yourself:** [github.com/paulo-lai/executable-specs-demo](https://github.com/paulo-lai/executable-specs-demo)
