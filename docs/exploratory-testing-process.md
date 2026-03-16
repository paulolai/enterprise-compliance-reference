# Exploratory Testing Process

## Overview

A structured approach to manual exploratory testing that combines weighted random walk methodology with multi-perspective critical analysis.

**Use when:** You need to discover unknown issues, validate user experience, or perform non-scripted testing on a web application.

---

## The Method: Weighted Random Walk + Multi-Perspective Analysis

### Phase 1: Weighted Random Walk (Automated Discovery)

**Purpose:** Surface unexpected behaviors and edge cases through semi-random exploration.

**Weight Distribution:**
- **60% Natural User Flow** - Browse, add to cart, checkout, login (mimic real users)
- **30% Weird/Unusual Actions** - Rapid refreshes, back button, double-clicks, invalid URLs
- **10% Edge Cases** - Clear storage, invalid data, empty states, boundary values

**What to Capture:**
- Screenshots of every significant state
- Console errors (JavaScript exceptions, network failures)
- UI anomalies (broken images, NaN values, missing elements)
- State inconsistencies (e.g., cart badge shows items but cart is empty)

### Phase 2: Multi-Perspective Analysis (Critical Review)

**Purpose:** Apply diverse professional expertise to evaluate each screen systematically.

**Core Personas:**

**Product Manager**
- Does this hurt conversion?
- Is the messaging clear to users?
- Are we missing business opportunities?
- Does this damage brand credibility?

**Lead QA Engineer**
- What's the root cause?
- Is this a functional blocker?
- How does this impact the testability?
- What automated tests are missing?

**Security Reviewer**
- Are there injection vulnerabilities (XSS, SQLi)?
- Is sensitive data exposed in URLs/console?
- Can users bypass auth or access others' data?
- Are inputs properly validated and sanitized?

**Accessibility Expert**
- Do all interactive elements have proper labels?
- Is color contrast sufficient (WCAG 4.5:1)?
- Can users navigate with keyboard only?
- Are screen reader announcements correct?

**Optional Additional Personas:**
- **Performance Engineer** - Load times, rendering, resource usage
- **First-Time User** - Confusion points, unclear instructions, hidden features
- **Mobile User** - Touch targets, responsive issues, mobile-specific UX

**Categories to Check:**
1. **UI/Visual** - Broken images, layout issues, responsive design
2. **UX/Usability** - Confusing flows, missing guidance, friction points
3. **Functional** - Broken features, incorrect calculations, data loss
4. **Performance** - Slow loading, janky interactions
5. **Accessibility** - Missing labels, poor contrast, keyboard navigation
6. **Security** - Data exposure, injection risks, auth issues

---

## Severity Classification

### 🔴 Critical
- **Definition:** Blocks primary user flow, causes data loss, or creates security issues
- **Action:** Fix immediately before release

### 🟠 Major
- **Definition:** Significant UX impact or workaround required
- **Action:** Fix in current sprint

### 🟡 Minor
- **Definition:** Cosmetic issues or minor inconveniences
- **Action:** Fix when convenient

### 🔵 Observation
- **Definition:** Not an issue, but worth noting for improvement
- **Action:** Document for future consideration

---

## Deliverables

### 1. Screenshots Directory
```
exploratory-findings/
├── 01-[state-name].png
├── 02-[state-name].png
└── ...
```

### 2. Structured Report Format
```json
{
  "screen": "Page/State Name",
  "severity": "critical|major|minor|observation",
  "category": "ui|ux|functional|performance|accessibility|security",
  "issue": "Description of the problem",
  "perspectives": {
    "pm": "Business impact from product perspective",
    "qa": "Technical root cause and fix suggestion",
    "security": "Security implications (if applicable)",
    "accessibility": "Accessibility concerns (if applicable)"
  }
}
```

### 3. Executive Summary
- Screens analyzed
- Issues by severity
- Top critical findings
- Recommended next steps

---

## Static Analysis for Security & Accessibility

**Before** exploratory testing, run automated static analysis:

### Security
- **Linter Rules:** ESLint security plugins (`eslint-plugin-security`)
- **Dependency Scanning:** `npm audit` or `pnpm audit`
- **Secret Detection:** Scan for API keys, tokens in code
- **CSP Analysis:** Check Content Security Policy headers

### Accessibility
- **Automated Scans:** axe-core, Lighthouse accessibility audit
- **Semantic HTML:** Validate heading hierarchy, landmarks
- **Color Contrast:** Automated contrast ratio checking
- **Keyboard Navigation:** Tab order verification

**Note:** Static analysis catches ~60% of issues. Exploratory testing catches the remaining 40% (contextual issues, user experience gaps).

---

## Best Practices

### When Exploring
- Start fresh (clear cookies/storage between sessions)
- Use realistic data
- Follow happy path first, then deviate
- Document everything
- Time-box the session
- Run static analysis **before** manual testing

### When Analyzing
- Question everything
- Think like the target persona
- Assume user confusion
- Check multiple device sizes
- Verify browser console
- Review security headers and network requests

### When Reporting
- Lead with business impact
- Provide visual evidence
- Suggest fixes, not just problems
- Prioritize ruthlessly
- Note which issues static analysis missed

---

## Common Findings to Watch For

### High-Probability Issues
- Page titles still showing defaults ("React App", "Vite App")
- Generic 404 pages instead of branded experience
- Unhandled JavaScript exceptions in console
- Blank pages instead of helpful empty states
- Poor form validation feedback

### Edge Cases to Try
- Clear localStorage mid-session
- Navigate directly to protected/checkout pages
- Use browser back button during multi-step flows
- Double-click submit buttons
- Resize browser to mobile dimensions
- Attempt access with invalid/expired auth

---

## Success Criteria

✅ **Exploration is successful when:**
- At least 10 distinct screens/states captured
- Both normal and edge case flows tested
- Multiple perspectives applied
- Issues classified by severity
- Business impact articulated
- Screenshots provide visual proof
- Report includes actionable recommendations

---

## Meta-Analysis: Testing Gaps Discovery

**Critical Insight:** Exploratory testing is most valuable when it reveals gaps in your testing infrastructure, not just application bugs.

### When Exploratory Testing Finds the "Wrong" Issues

If exploratory testing discovers issues that could have been caught by:
- HTML validation
- Accessibility scanners (axe-core)
- E2E tests
- Unit tests
- Static analysis

Then you have **testing gaps**, not just application bugs. The meta-work is to:

1. **Document the gap** (what should have caught it)
2. **Implement the detection method** (close the gap)
3. **Validate it catches the issue** (prove the gap is closed)
4. **Then fix the actual issue**

### High-Value Exploratory Testing Targets

Exploratory testing excels at finding:
- Race conditions
- State management bugs  
- Security edge cases
- UX friction points
- Edge case user flows
- Integration issues

**It should NOT be finding:**
- Missing HTML titles
- Incomplete features
- Missing 404 pages
- Basic accessibility violations

These indicate gaps in static analysis and systematic testing.

### Case Study: This Session

**What we found:** 4 issues (3 major, 1 minor)
**Where they should be caught:**
- HTML validation (title)
- E2E tests (shipping, 404)
- axe-core (headings)

**The meta-finding:** Our testing pyramid is inverted. Expensive manual testing is catching issues that cheap automation should handle.

**See:** [docs/testing-gaps-analysis.md](testing-gaps-analysis.md) for complete gap analysis and improvement plan
