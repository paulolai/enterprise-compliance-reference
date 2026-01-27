export interface AllureAdapter {
  epic(name: string): void;
  feature(name: string): void;
  story(name: string): void;
  description(content: string): void;
  label(name: string, value: string): void;
  attachment(name: string, content: string | Buffer, type: string): void;
}

export interface RuleMetadata {
  name?: string;       // Test name identifier
  ruleReference: string;
  rule: string;
  tags?: string[];

  // Hierarchical Metadata
  epic?: string;        // Business Goal (e.g., "Revenue Protection")
  feature?: string;     // Domain (e.g., "Pricing", "Cart")
  story?: string;       // Rule/Story (e.g., "Bulk Discounts apply > 3")

  // Technical Hierarchy
  parentSuite?: string; // Layer (e.g., "API Verification")
  suite?: string;       // Domain (e.g., "Pricing")
  subSuite?: string;    // Context (e.g., "Bulk Discounts")
}

const SECTION_MAP: Record<string, string> = {
  '1': 'Base Rules',
  '2': 'Bulk Discounts',
  '3': 'VIP Tier',
  '4': 'Safety Valve',
  '5': 'Shipping Calculation'
};

export function registerAllureMetadata(allure: AllureAdapter, metadata: RuleMetadata) {
  if (!allure) return;
  
  // 1. Business Hierarchy (BDD)
  if (metadata.epic) {
    allure.epic(metadata.epic);
  } else {
    // Fallback: If no Epic provided, group by Section Name if available
    const match = metadata.ruleReference.match(/§(\d+)/);
    if (match && match[1]) {
      const sectionNum = match[1];
      const sectionName = SECTION_MAP[sectionNum] || `Section ${sectionNum}`;
      allure.epic(`${sectionNum}. ${sectionName}`);
    } else {
      allure.epic('General Logic');
    }
  }

  // Feature defaults to provided feature, or derived from Suite if missing
  if (metadata.feature) {
    allure.feature(metadata.feature);
  } else if (metadata.suite) {
    allure.feature(metadata.suite);
  }

  // Story defaults to provided story, or Rule Reference
  if (metadata.story) {
    allure.story(metadata.story);
  } else {
    allure.story(metadata.ruleReference);
  }

  // 2. Technical Hierarchy (xUnit)
  if (metadata.parentSuite) allure.label('parentSuite', metadata.parentSuite);
  if (metadata.suite) allure.label('suite', metadata.suite);
  if (metadata.subSuite) allure.label('subSuite', metadata.subSuite);

  // 3. Description & Tags
  allure.description(`**Business Rule:** ${metadata.rule}\n\n**Reference:** ${metadata.ruleReference}`);

  if (metadata.tags) {
    metadata.tags.forEach(tag => allure.label('tag', tag));
  }
}
