# Executable Specifications Demo

[![CI](https://github.com/paulolai/executable-specs-demo/actions/workflows/test.yml/badge.svg)](https://github.com/paulolai/executable-specs-demo/actions)

**Bank-grade compliance testing without the bureaucracy.**

This repository demonstrates how regulated industries (FinTech, Banking, HealthTech) can generate audit-ready evidence as a side effect of normal development—no manual screenshots, no Word documents, no translation layers.

## Why You Should Care

| Your Role | What You Get |
|-----------|-------------|
| **Product Owner** | Business-readable attestation reports that prove features work |
| **Engineer** | Type-safe tests with IDE refactoring support—no fragile Gherkin strings |
| **Compliance Officer** | Auto-generated evidence linking every test to business requirements |
| **Engineering Leader** | Reference architecture proving "High Velocity" and "High Compliance" coexist |

## Start Here

```bash
# Clone and run everything (tests, attestation report, allure)
git clone https://github.com/paulolai/executable-specs-demo.git
cd executable-specs-demo
pnpm install
pnpm run test:all
```

## Navigate by Role

| You want to... | Read this |
|----------------|-----------|
| Understand the philosophy & rationale | [docs/PHILOSOPHY.md](docs/PHILOSOPHY.md) |
| Get started as a developer | [docs/ONBOARDING.md](docs/ONBOARDING.md) |
| Learn how to use attestation reports | [docs/STAKEHOLDER_GUIDE.md](docs/STAKEHOLDER_GUIDE.md) |
| Understand the testing patterns | [docs/TEACHING_GUIDE.md](docs/TEACHING_GUIDE.md) |
| See the business rules being tested | [docs/pricing-strategy.md](docs/pricing-strategy.md) |
| Explore the API | [docs/API.md](docs/API.md) |

## Quick Example

```typescript
// An invariant that proves a business rule across infinite inputs
it('Final Total is always <= Original Total', () => {
  verifyInvariant({
    ruleReference: 'pricing-strategy.md §1',
    rule: 'Final Total must never exceed Original Total',
    tags: ['@pricing', '@revenue-protection']
  }, (_items, _user, result) => {
    expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
  });
});
```

---

*For the future of this pattern in HealthTech and AI, see [AI_PATTERN_BLUEPRINT.md](AI_PATTERN_BLUEPRINT.md).*
