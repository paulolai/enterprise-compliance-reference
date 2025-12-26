# Executable Specifications Pattern

**Achieving shared understanding without the "Translation Layer".**

## 📖 The Philosophy

For years, the industry has relied on Gherkin (Cucumber) to bridge the gap between Product requirements and Engineering code. While the intention was noble, the reality for many teams has been:

- **The "Regex Tax":** Maintaining fragile mappings between plain English strings and code.
- **Tooling Friction:** Limited refactoring support and clumsy debugging experiences.
- **The "Green Illusion":** Tests that pass but don't actually reflect the complex state of the system.

**This repository demonstrates an alternative strategy.**

Instead of a translation layer, we treat **Code as the Specification** and **Reports as the Attestation**.

## 🏗 The 4 Pillars of this Pattern

### 1. The Strategy Document (/docs)

We replace disconnected Jira tickets or "Given/When/Then" feature files with a durable **Markdown Strategy** document. This lives in the repository, evolves with the code, and acts as the single source of truth for both Engineers and AI Agents.

### 2. Native Testing Frameworks

We use the tools engineers already love (Vitest for TypeScript, JUnit 5 for Java). No external plugins, no "Step Definitions," no context-switching.

### 3. Fluent Fixtures & Builders

Instead of parsing English sentences, we use strongly-typed **Test Data Builders** (Helpers). This provides:

- **Type Safety:** If the domain changes, the compiler tells you immediately.
- **Readability:** Tests read like sentences (`cart.withItem(...).asVip()`).
- **Refactorability:** Rename a method in the code, and your IDE updates every test instantly.

### 4. Attestation Reports

The "Human Readable" part comes at the **end**, not the beginning. We generate rich, custom test reports that serve as an **Audit Log**. These reports map inputs to outputs, verifying that the business logic (defined in the Strategy) was actually executed.

---

## 📚 Documentation & Guidelines

This project follows strict engineering standards. Agents and Engineers should refer to:

- [**AI Agent Protocol**](AGENTS.md): Operational rules for Gemini, Copilot, and other AI assistants.
- [**Project Guidelines**](docs/TS_PROJECT_GUIDELINES.md): Core principles, code style, and architectural philosophy.
- [**Testing Framework**](docs/TS_TESTING_FRAMEWORK.md): The mandatory standard for writing tests (templates, patterns, anti-patterns).
- [**Test Strategy**](docs/TEST_STRATEGY.md): The specific "Code as Specification" methodology used for the Pricing Engine.
- [**Deep Dive: Why This Beats Type-Safe Gherkin**](docs/BDD_COMPARISON.md): Detailed comparison showing why eliminating the translation layer > fixing it with types.

## 📂 Repository Structure

This project demonstrates that the pattern is **language agnostic**. The same Strategy Document drives multiple implementations.

```text
.
├── docs/
│   └── pricing-strategy.md      # The SHARED Source of Truth.
├── implementations/
│   ├── typescript-vitest/       # Implementation A: Next.js/Node style
│   └── java-junit5/             # Implementation B: Enterprise Java style (Planned)
└── reports/                     # Generated attestations (HTML/JSON)
```

## ⚔️ Comparison: The Gherkin Way vs. The Executable Spec Way

| Feature | The Gherkin/Cucumber Way | The Executable Spec Pattern |
| :--- | :--- | :--- |
| **Source of Truth** | Feature Files (.feature) | Markdown Strategy + The Code itself |
| **Logic Mapping** | Fragile Regex / String Matching | Strong Typing / Direct Method Calls |
| **Refactoring** | Manual, error-prone (Ctrl+F) | Instant, safe (F2 / Rename Symbol) |
| **Debugging** | Often requires complex IDE plugins | Standard Breakpoints |
| **Stakeholder View** | They read the Input (The Feature file) | They read the Output (The Attestation Report) |
| **Maintenance Cost** | High (The Translation Layer) | Low (Standard Code Maintenance) |

## 🚀 The Scenario: Dynamic Pricing Engine

To demonstrate this, we implement a pure-logic **Pricing Engine**. This is the classic "Gherkin Trap"—a domain heavy on rules and combinations that usually results in unmaintainable feature files.

**The Strategy:**

- **Base Rules:** AUD currency, 10% GST included.
- **Bulk Discounts:** Buy 3+ items, get 15% off.
- **VIP Tier:** Tenure > 2 years gets an extra 5% off subtotal.
- **Safety Valve:** Max discount capped at 30%.

## 🛠 Getting Started

### TypeScript / Vitest Implementation

Navigate to the implementation folder:

```bash
cd implementations/typescript-vitest
npm install
npm test
```

*Check the console output or the generated `/reports` folder to see the Attestation Report.*