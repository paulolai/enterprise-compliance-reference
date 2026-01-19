export interface AllureAdapter {
  epic(name: string): void;
  feature(name: string): void;
  story(name: string): void;
  description(content: string): void;
  label(name: string, value: string): void;
  attachment(name: string, content: string | Buffer, type: string): void;
}

export interface RuleMetadata {
  ruleReference: string;
  rule: string;
  tags?: string[];
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
  
  // Set consistent Epic
  allure.epic('Pricing Engine');

  // Parse Reference for Feature
  // Expect format like: "pricing-strategy.md §2" or "pricing-strategy.md §3.1"
  const match = metadata.ruleReference.match(/§(\d+)/);
  if (match && match[1]) {
    const sectionNum = match[1];
    const sectionName = SECTION_MAP[sectionNum] || `Section ${sectionNum}`;
    allure.feature(`${sectionNum}. ${sectionName}`);
  } else {
    allure.feature('General Logic');
  }

  // Set Story
  allure.story(metadata.ruleReference);

  // Set Description
  allure.description(`**Business Rule:** ${metadata.rule}\n\n**Reference:** ${metadata.ruleReference}`);

  // Set Tags
  if (metadata.tags) {
    metadata.tags.forEach(tag => allure.label('tag', tag));
  }
}
