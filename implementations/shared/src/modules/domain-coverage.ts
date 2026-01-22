// Types for domain coverage tracking

export interface BusinessRule {
  section: string;           // e.g., "1", "2", "5.1"
  title: string;             // e.g., "Base Rules (Currency & Tax)"
  invariants: Invariant[];   // List of invariants in this section
}

export interface Invariant {
  id: string;                // e.g., "final-total-lte-original"
  description: string;       // e.g., "Final Total <= Original Total"
  required: boolean;         // Is this rule required for coverage?
}

export interface DomainCoverageResult {
  rules: RuleCoverage[];
  summary: {
    totalRules: number;
    coveredRules: number;
    coveragePercentage: number;
  };
}

export interface RuleCoverage {
  ruleReference: string;     // e.g., "pricing-strategy.md §1"
  title: string;
  covered: boolean;
  tests: TestReference[];
}

export interface TestReference {
  testName: string;
  filePath: string;
  layer: 'API' | 'GUI';      // API vs GUI test
}
