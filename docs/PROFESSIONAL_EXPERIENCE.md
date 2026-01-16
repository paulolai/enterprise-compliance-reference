# Paulo Lai's Professional Experience: Engineering Leadership & Architecture

## Executive Summary
Engineering Leader and Architect with over 20 years of experience at **Google**, **Commonwealth Bank (CBA)**, and high-growth scale-ups. Specialized in creating the "connective tissue" of engineering: the platforms, processes, and people structures that enable high-velocity, high-assurance delivery.

Expertise includes **AI Systems Engineering**, **Shift-Left Quality Transformations**, **Regulatory Compliance as Code**, and **Platform Reliability**.

---

## Key Achievements: The "Reference Architecture"
*   **Google (2011-2018):** Leveraged tool-based signals (Compiler, Build System) to accelerate release cycles from 3 months to daily/weekly for Google Drive (100M+ users), while reducing crash rates by 90%.
*   **Commonwealth Bank (2022-2024):** Hired as the bank's first **Staff Quality Engineer** to define the standard for modern testing.
    *   Replaced manual "ServiceNow" attestation with automated Type-Safe Verification.
    *   Reduced API debugging time from 30 minutes to seconds.
    *   Built the bank's first ephemeral test environments (AWS Lambda/SST), enabling isolated testing per PR.
    *   Achieved "Shift Left" by coaching software engineers to own quality, moving testing from a siloed activity to a core engineering discipline.

---

## Detailed Experience

### Staff Quality Engineer | Commonwealth Bank | Oct 2022 - Mar 2024
*Hired as the bank's first Staff QE to establish a "Reference Implementation" for modern engineering.*

**The Challenge:**
The bank faced a "Velocity vs. Veracity" conflict. Release processes were heavily manual (screenshots in Word docs), and the existing test automation (Gherkin/Cucumber) was a maintenance burden that slowed delivery without providing true confidence.

**The Strategy:**
I architected a new testing framework designed to be an "Exemplar" for the organization.

*   **Architecture:** Replaced the fragile Gherkin translation layer with **Type-Safe Executable Specifications** using TypeScript/Vitest. This eliminated "Semantic Drift" and reduced test code volume by 60%.
*   **Infrastructure:** Implemented **Ephemeral Test Environments** using AWS Lambda and SST.dev. This allowed every Pull Request to be tested in isolation, breaking the dependency on shared, flaky staging environments.
*   **Culture:** Led a "Shift Left" transformation. Instead of having a separate QA team write Gherkin scripts, I coached Software Engineers to write high-quality, auditable tests as part of their feature work.
*   **Compliance:** Automated the "Attestation" process. Instead of manual evidence gathering, the new framework generated regulatory-grade audit reports directly from test execution, satisfying strict banking compliance requirements automatically.

**Key Learnings:**
*   **Innovation vs. Inertia:** Successfully built a "Willing Coalition" of developers and BAs who embraced modern practices, even while facing systemic resistance from legacy testing structures.
*   **Political Engineering:** Learned that technical correctness is only half the battle; true transformation requires aligning incentives and managing political capital effectively.

---

### Staff Software Engineer | Home-In (CBA Venture) | Jun 2024 - Nov 2024
*Modernizing legacy low-code systems.*

*   **Refactoring:** Applied TDD and Clean Code principles to modernize a legacy Pega application.
*   **Architecture:** Re-architected critical AWS Lambda services to improve modularity and data integrity.
*   **Operations:** Worked directly with customer ops teams to identify and fix bottlenecks, improving operational efficiency for the first time in 3 years.

---

### Engineering Manager, Platform | Octopus Deploy | Feb 2021 - Apr 2022
*Scaling reliability during hyper-growth.*

*   **Platform Engineering:** Built the company's first Platform Team.
*   **Cost Optimization:** Optimised CI/CD cloud usage, saving >$500k USD/year.
*   **SRE Implementation:** Defined and hired the first Site Reliability Engineers (SREs), establishing the company's reliability strategy.

---

### Test Engineer | Google | 2011 - 2018
*Leveraging world-class engineering signals to accelerate velocity.*

My focus was entirely on **Acceleration**. I didn't build "QA Silos"; instead, I focused on extracting high-fidelity **Signals** from the world-class tools built by Google’s engineers to speed up testing, development, and releases.

*   **Google Drive:** Owned end-to-end quality for the Android app (100M+ MAU). Reduced crash rate by 90% by shifting from reactive manual testing to proactive signal monitoring.
*   **Google Maps Transit:** Reduced production failures by 40% through automated analysis and prevention controls that integrated directly into the developer workflow.
*   **Velocity:** Transformed the release cadence from quarterly to weekly/daily "dogfood" releases by automating the "Verification Tax."

---

## Engineering Philosophy: Signals vs. Silos

I believe that high-quality software is a byproduct of **Engineering Excellence**, not "testing." My approach is based on two core principles:

1.  **Leverage Native Signals:** Quality should be extracted from the tools developers already use (the Compiler, the Type System, the Build Pipeline). If you have to build a separate "Quality Castle" (like a siloed Gherkin framework), you have already lost.
2.  **Automate the Bureaucracy:** In regulated environments, "Compliance" is often the enemy of "Velocity." I build systems where compliance artifacts (Attestation Reports) are automatically generated as a side effect of good engineering, removing the friction from the release cycle.
