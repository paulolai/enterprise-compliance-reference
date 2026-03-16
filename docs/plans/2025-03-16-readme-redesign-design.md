# README Redesign: From Rant to Helpful

## Problem Statement

The current README is 290 lines of dense text that mixes philosophy, technical details, and setup instructions. It rants about "Gherkin Tax" and "Manual Attestation Tax" before explaining what the repo actually does. This creates friction for visitors who want to quickly understand if this repo is relevant to them.

## Design Goals

1. **Quick value proposition** - Reader knows within 10 seconds if this repo solves their problem
2. **Clear navigation** - Different audiences find their path immediately
3. **Minimal surface area** - Only essential information on the README landing page
4. **Split philosophy into separate doc** - The conceptual arguments belong in docs/, not blocking the front door

## Target Structure (~50 lines)

```markdown
# Executable Specifications Demo

## What This Is
One paragraph explaining bank-grade testing without bureaucracy.

## Why You Should Care
- For Product Owners: Auto-generated compliance evidence
- For Engineers: Type-safe tests that don't rot
- For Compliance Officers: Audit-ready attestation reports

## Start Here
pnpm install && pnpm run test:all

## Navigate by Role
| You are... | Start with |
|------------|-----------|
| Product/Business | [Stakeholder Guide](docs/STAKEHOLDER_GUIDE.md) |
| Developer | [Onboarding](docs/ONBOARDING.md) |
| Compliance/Audit | [Attestation Reports](docs/reference/attestation-architecture.md) |
| Evaluating the Pattern | [Philosophy & Rationale](docs/PHILOSOPHY.md) |
```

## Content Migration Plan

### Moving FROM README.md TO docs/PHILOSOPHY.md:
- Lines 27-43: "The Mission" rant about Shift Left
- Lines 40-118: The 3 Pillars section (Zero-Tax, Continuous Attestation, Autonomous Quality)
- Lines 121-128: Origin Story
- Lines 44-99: Gherkin vs Executable Specs comparison table
- Lines 145-149: Stack rationale section

### Moving FROM README.md TO docs/ONBOARDING.md (merge):
- Lines 131-163: Getting Started section
- Lines 165-202: Running Tests Locally
- Lines 204-263: Project Structure

### What STAYS on README.md:
- Title and one-line tagline
- "What This Is" (1 paragraph)
- "Why You Should Care" (audience table)
- "Start Here" (single command)
- "Navigate by Role" (links table)
- Badges (CI status, license)

## Verification Criteria

- [ ] New README is under 60 lines
- [ ] All philosophical content moved to docs/PHILOSOPHY.md
- [ ] No duplicate setup instructions (all point to ONBOARDING.md)
- [ ] All existing doc links still work
- [ ] Quick Reference table removed (redundant with navigation)
- [ ] Essential Reading section removed (redundant)

## Implementation Notes

1. Create docs/PHILOSOPHY.md as new file
2. Rewrite README.md from scratch (don't edit incrementally)
3. Verify no broken links
4. Test that `pnpm run test:all` still works
