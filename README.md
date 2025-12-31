# Shift Left Reference Architecture: Developer-Native Compliance

**An up to date public recreation of the reference implementation built at Commonwealth Bank.**

> *How to enable developers to own Quality & Compliance without slowing them down.*

## 🎯 The Mission

"Shift Left" initiatives usually fail because organizations ask developers to do "QA Work"—writing Gherkin scripts, taking manual screenshots, and filling out Word documents for ServiceNow.

**This repository demonstrates the only way to make Shift Left work in regulated environments:**
You must stop asking developers to be testers and start enabling them to do testing using their native tools.

This requires **Developer-Native Compliance**: tools that automate the bureaucracy so engineers can focus on code.

## 🏛 Origin Story

This project is a public recreation of the work I delivered as **Commonwealth Bank’s first Staff Quality Engineer**, synthesizing lessons from 20+ years including years at **Google** and high-growth startups.

It solves a specific, painful problem found in enterprises:
*   **The Pain:** Developers blocked by "Translation Layer Taxes" (Gherkin) and "Manual Attestation Taxes" (ServiceNow uploads).
*   **The Solution:** A Reference Architecture that uses **Type Safety** and **Automated Reporting** to deliver Bank-grade compliance with Google-grade velocity.

## 🔑 The Core Concept: Signals vs. Silos

At **Google**, we didn't use Gherkin. We didn't build "Quality Silos." We leveraged **Signals** from the tools build by developers for devlopers to accelerate release velocity.

At **CBA**, I applied this philosophy to the regulated world:

| The "Wrong" Way to Shift Left | The Reference Architecture Way |
| :--- | :--- |
| **Tooling** | Forcing devs to use Gherkin/Cucumber | **Native Tooling:** TypeScript & Vitest |
| **Compliance** | Manual Word Docs + Postman Screenshots | **Dual Artifacts:** Attestation (regulatory) + Allure (trends) |
| **Verification** | "Green Build" (Pass/Fail) | **Deep Observability:** Execution traces + historical analytics |
| **Result** | Developers rebel; Quality drops | Developers engage; Quality improves |

## 🏗 The 3 Pillars of Enablement

### 1. Zero-Tax Verification (The Google Lesson)
**We eliminate the Gherkin Tax.**
Instead of fragile "Given/When/Then" strings that desync from code, we use **Type-Safe Test Data Builders**.
*   **Impact:** Refactoring is fast. Developers write tests because it feels like coding, not data entry.

### 2. Continuous Attestation (The CBA Lesson)
**We automate the Release Tax.**
In banking, you can't ship without proof. Instead of manual screenshots, our architecture generates **two complementary artifacts** directly from the test run:
- **Attestation Report**: Self-contained HTML with business rule traceability (for auditors)
- **Allure Report**: Historical trends and dashboards (for teams)
*   **Impact:** The "Release Evidence" is generated in seconds by the CI pipeline, not hours by a human.

### 3. Infinite Examples (The Scalability Lesson)
**We scale coverage without scaling effort.**
Using **Property-Based Testing**, we define the business rule once and let the machine generate thousands of edge cases.
*   **Impact:** We catch bugs (negative values, empty carts) that humans forget to check, without writing thousands of lines of code.

---

## 📂 Repository Structure

-   [**The Reference Implementation**](implementations/typescript-vitest/): The solution (Vitest, PBT, Custom Attestation).
-   [**The Legacy Comparison**](implementations/typescript-cucumber/): The anti-pattern (Gherkin) to demonstrate the maintenance burden.
-   [**The Shift Left Playbook**](docs/guides/shift-left-playbook.md): **Start Here for Leaders.** A guide on how to coach teams through this transition.

## 🛠 Getting Started

Experience **Developer-Native Compliance** in action:

```bash
cd implementations/typescript-vitest
npm install
npm test
```

*Open the generated `reports/` folder to see the Regulatory-Grade Attestation Report generated automatically.*

---

## 📊 Complete Reporting Architecture

At **Google**, we didn't have separate "QA tools" and "dev tools"—everything was an artifact of how engineers worked.

At **CBA**, I applied the same principle: The reporting architecture is **not an afterthought**, but a core design decision that serves different stakeholders through different artifacts.

### The Two-Artifact Strategy

Rather than forcing one report type to satisfy all needs, this architecture generates **two complementary artifacts** from the same test run:

| Artifact | Design Target | Primary Use Case |
| :--- | :--- | :--- |
| **Attestation Report** | Regulatory compliance, business rule traceability | Auditors, compliance officers, stakeholders needing proof |
| **Allure Report** | Historical analysis, team collaboration, integration | Developers, QA leads, managers tracking trends |

**This is deliberate architecture**, not a compromise. We don't force executives to parse test logs, and we don't force auditors to navigate interactive dashboards. Each persona gets the format that serves them.

### Running Tests

```bash
cd implementations/typescript-vitest
npm install

# Standard test run - generates both reports
npm test

# OR run with explicit Allure configuration (for advanced users)
npm run test:allure
```

Both commands generate:
- **Attestation HTML**: `reports/{timestamp}/attestation-full.html`
- **Allure Results**: `allure-results/` (JSON data)

### Viewing Reports

#### Attestation Report (Primary Compliance Artifact)

The attestation report requires no external tools—just open `attestation-full.html` in any browser.

**Features:**
- Business rule traceability matrix (every rule → tests that verify it)
- Embedded execution traces (exact inputs/outputs from test runs)
- Pass/fail status per business invariant
- Git metadata for audit trail

#### Allure Report (Historical Analytics)

Requires Java (v11+) for HTML generation:

```bash
# Generate a static HTML report
npm run report:allure:generate

# OR serve interactive report locally
npm run report:allure:serve
```

**Features:**
- Test duration trends over time
- Flakiness detection
- Visual dashboards with charts/graphs
- Integration with enterprise tools (Jira, Slack, Teams)
- CI badge generation

**If Java is not available locally**: The JSON results are captured and can be viewed in CI-generated reports.

### CI/CD Integration

The GitHub Actions workflow generates both artifacts automatically:

1. **Attestation Report** (`attestation-reports`) - 30-day retention
2. **Allure Results** (`allure-results-{run_number}`) - 90-day retention
3. **Allure HTML** (`allure-report-{run_number}`) - 90-day retention

**To view CI reports:**
1. Go to GitHub Actions run
2. Scroll to "Artifacts" section
3. Download and extract
4. Open `index.html` in browser

### Enterprise Integration

The Allure integration is architected for enterprise adoption:

- **Jira/Xray/Zephyr**: Test-to-work-item linking via configuration templates
- **Tag Mapping**: Existing `@critical` tags automatically map to Allure severity
- **Custom Categories**: Group failures by error patterns for triage
- **Team Notifications**: Slack/Teams integration for test status

**No Migration Required**: Your existing `registerInvariant()` metadata works with both systems simultaneously.

### When to Use Which Report

| Scenario | Use This Report | Why |
| :--- | :--- | :--- |
| **Audit / Regulatory Review** | Attestation | Self-contained HTML works offline, has business rule traceability |
| **Show Executives Progress** | Allure | Visual dashboards with trend lines and metrics |
| **Investigate Test Failure** | Either | Attestation has execution traces, Allure has failure history |
| **Team Velocity Tracking** | Allure | Charts and flakiness detection across builds |
| **Compliance Evidence** | Attestation | Designed for 7-year offline archival for regulated industries |

---

## 📚 Essential Reading

### Implementation Guides (The "How")

*   **[The Shift Left Playbook](docs/guides/shift-left-playbook.md)** ⭐ *Start Here*
    *   Real-world experience from CBA on how to coach teams
    *   Practical techniques for enabling developer ownership of quality

*   **[The Economic Case](docs/reference/benchmarks.md)**
    *   Evidence-based metrics and ROI analysis
    *   Measurement methodology from the Reference Implementation

### Technical Standards

*   **[Attestation Architecture](docs/reference/attestation-architecture.md)** - Automating compliance
*   **[Infinite Examples](docs/reference/infinite-examples.md)** - Property-Based Testing
*   **[Regression Safety](docs/reference/regression-safety.md)** - Golden Master pattern
*   **[Semantic Integrity](docs/reference/semantic-integrity.md)** - Type safety architecture

---

*This architecture is designed for Engineering Leaders who need to prove that "High Velocity" and "High Compliance" are not mutually exclusive.*