# Adoption of shadcn/ui for UI Component Architecture

* **Status:** Accepted
* **Date:** 2026-02-19
* **Context:** Demo Application — Automated Testing Focus

## Context

The primary objective of this repository is to demonstrate high-quality engineering practices, specifically focusing on robust **automated testing strategies**.

To achieve this, the application requires a User Interface (UI) that:

1. **Is visually professional:** It must look credible without requiring significant design effort.
2. **Minimises code noise:** The component implementation should not obscure the logic being tested.
3. **Supports testing best practices:** The underlying DOM structure must support semantic querying (e.g., `getByRole`) rather than relying on brittle CSS selectors or implementation details.
4. **Reflects modern architecture:** The stack should demonstrate current industry standards regarding accessibility (a11y) and composition.

We evaluated three approaches:

* **Heavy Component Libraries (e.g., Material UI/MUI):** rejected due to the "black box" nature of components, heavy bundle size, and rigid DOM structures that can complicate precise testing.
* **Utility-First CSS (Raw Tailwind):** rejected due to the high effort required to build complex interactive components (modals, dropdowns) that are fully accessible.
* **Headless Components + Utility Styling (shadcn/ui):** Selected.

## Decision

We will adopt **shadcn/ui** as the UI framework for this project.

Technically, this is not a library dependency but a pattern of copying component source code into our repository. These components are built using **Radix UI** (headless primitives for accessibility/behaviour) and styled with **Tailwind CSS**.

## Consequences

### Positive Consequences

* **Testing Rigour:** Radix UI primitives guarantee WAI-ARIA compliance. This enforces "Testing by User Behaviour" (e.g., `screen.getByRole('dialog')`) rather than implementation details, which is a core tenet of the engineering practices we aim to demonstrate.
* **Code Ownership:** Because the component code lives in our repo (`/components/ui`), we have full control over the implementation. There is no `node_modules` abstraction layer hiding the component logic.
* **Decoupled Architecture:** This choice demonstrates the separation of behaviour (Radix) from presentation (Tailwind), a superior architectural pattern to traditional styling coupled with logic.
* **Visual Standardisation:** Provides a clean, professional aesthetic out-of-the-box, allowing focus to remain on the test suites.

### Negative Consequences

* **Initial Boilerplate:** Unlike installing a single package, we must initialise the library and add individual components, resulting in more files in the source tree.
* **Maintenance:** We are responsible for the code within `components/ui`. Upgrades are manual (copy-pasting diffs) rather than a simple `npm update`.

## Compliance

This decision aligns with the project's goal of modelling "Good Engineering Practices" by prioritising accessibility standards and semantic HTML, which directly facilitates higher-quality automated tests.
