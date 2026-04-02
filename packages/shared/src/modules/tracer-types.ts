// Shared tracer types for test observability
// Extracted from old TestTracer implementation — types only, no runtime code.

export interface Interaction<TInput = unknown, TOutput = unknown> {
  input: TInput;
  output: TOutput;
  timestamp: number;
}

export interface InvariantMetadata {
  name: string;
  ruleReference: string;
  rule: string;
  tags: string[];
}

// Summary structure for attestation reports
export interface InvariantSummary {
  name: string;
  ruleReference: string;
  rule: string;
  tags: string[];
  totalRuns: number;
  passed: boolean;
  failureReason?: string;
  edgeCasesCovered: {
    vipUsers: number;
    nonVipUsers: number;
    exactlyTwoYearTenure: number;
    bulkItems: number;
    nonBulkItems: number;
    freeShippingQualifying: number;
    freeShippingNotQualifying: number;
    discountCapHit: number;
    expressShipping: number;
    expeditedShipping: number;
  };
}

export interface Tracer {
  log(testName: string, input: any, output: any): void;
}
