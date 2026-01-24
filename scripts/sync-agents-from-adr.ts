#!/usr/bin/env tsx
/**
 * Script: sync-agents-from-adr.ts
 *
 * Generates ADR-summary.md from docs/ARCHITECTURE_DECISIONS.md
 *
 * Human Layer: ADRs contain context, trade-offs, decisions
 * Agent Layer: ADR-summary.md contains only executable constraints
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const ADR_PATH = path.join(__dirname, '../docs/ARCHITECTURE_DECISIONS.md');
const ADR_EXTRACTS_PATH = path.join(__dirname, '../ADR-extracts.md');

interface ADRIssue {
  number: number;
  title: string;
  status: string;
  category: string;
  content: string;
}

// ============================================================================
// PARSER: Extract ADR decisions from Markdown
// ============================================================================

function extractCategories(markdown: string): Map<number, string> {
  const categories = new Map<number, string>();

  // Find all section headers like "## I. Testing Strategy"
  const sectionPattern = /^##\s+([IVXLCDM]+)\.\s+(.+)$/gm;
  const matches = [...markdown.matchAll(sectionPattern)];

  // Build mapping: find each ADR and determine which section it belongs to
  const adrPattern = /^###\s+(\d+)\./gm;
  const adrMatches = [...markdown.matchAll(adrPattern)];

  let currentCategory = 'General';
  let currentSectionIndex = -1;

  for (const adrMatch of adrMatches) {
    const adrNumber = parseInt(adrMatch[1], 10);
    const adrIndex = adrMatch.index;

    // Find which section this ADR falls under
    let currentSection = '';

    for (let i = matches.length - 1; i >= 0; i--) {
      if (matches[i].index < adrIndex) {
        currentSection = matches[i][2].trim();
        break;
      }
    }

    categories.set(adrNumber, currentSection || 'General');
  }

  return categories;
}

function parseADRs(markdown: string): ADRIssue[] {
  const issues: ADRIssue[] = [];
  const categories = extractCategories(markdown);

  // Find all ADR header positions first
  const adrPositions: { number: number; title: string; index: number }[] = [];
  const headerPattern = /###\s+(\d+)\.\s+([^\n]+)/g;
  let match: RegExpExecArray | null;

  while ((match = headerPattern.exec(markdown)) !== null) {
    adrPositions.push({
      number: parseInt(match[1], 10),
      title: match[2].trim(),
      index: match.index,
    });
  }

  // Now extract content between each ADR
  for (let i = 0; i < adrPositions.length; i++) {
    const current = adrPositions[i];
    const next = adrPositions[i + 1];

    // Extract content from current header to next header
    const startIndex = current.index;
    const endIndex = next ? next.index : markdown.length;
    const content = markdown.slice(startIndex, endIndex);

    // Parse status from content
    const statusMatch = content.match(/\*\*Status:\*\*\s+(\w+)/);
    const status = statusMatch ? statusMatch[1] : 'Unknown';

    issues.push({
      number: current.number,
      title: current.title,
      status,
      category: categories.get(current.number) || 'General',
      content,
    });
  }

  return issues;
}

// ============================================================================
// TRANSFORMER: Convert ADR sections to agent rules
// ============================================================================

interface AgentRule {
  adrNumber: number;
  title: string;
  category: string;
  section: string;
  rule: string;
  type: 'MUST' | 'MUST NOT' | 'SHOULD' | 'INFO';
}

function extractRules(adr: ADRIssue): AgentRule[] {
  const rules: AgentRule[] = [];
  const lines = adr.content.split('\n');
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track sections for context (h4 headers are #### title)
    if (line.startsWith('####')) {
      currentSection = line.replace('####', '').trim().split(' {')[0].trim(); // Strip IDs like {#rule-7}
      continue;
    }

    // Skip empty lines and code blocks
    if (!line.trim() || line.startsWith('```')) continue;

    // Skip non-bullet lines under Rule section
    if (currentSection.toLowerCase() === 'rule') {
      if (!line.startsWith('*') && !line.startsWith('-')) continue;
    }

    // Rule section: Extract bullet points as MUST rules
    if (currentSection.toLowerCase() === 'rule') {
      if (line.startsWith('*') || line.startsWith('-')) {
        let ruleText = line.replace(/^[*#-]\s*\*\*?\s*/, '').replace(/\*\*\s*$/, '').trim();

        // Skip horizontal rules and labels
        if (ruleText === '---' || ruleText.endsWith(':')) continue;

        const classified = classifyRule(ruleText);
        rules.push({
          adrNumber: adr.number,
          title: adr.title,
          category: adr.category,
          section: currentSection,
          rule: classified === 'MUST' ? ruleText.replace(/:$/, '') : ruleText,
          type: classified,
        });
      }
    }

    // Critical/Security rules (standalone bullet point in Critical section)
    if (currentSection.toLowerCase().includes('critical') && line.startsWith('*')) {
      rules.push({
        adrNumber: adr.number,
        title: adr.title,
        category: adr.category,
        section: currentSection,
        rule: line.replace(/^[*#-]\s*/, '').trim(),
        type: 'MUST',
      });
    }

    // Verification rule (standalone bullet)
    if (currentSection.toLowerCase() === 'verification rule' && line.startsWith('*')) {
      rules.push({
        adrNumber: adr.number,
        title: adr.title,
        category: adr.category,
        section: currentSection,
        rule: line.replace(/^[*#-]\s*/, '').trim(),
        type: 'MUST',
      });
    }

    // Quality Gates (table rows)
    if (currentSection.toLowerCase().includes('quality gate') && line.startsWith('|')) {
      // Skip header rows
      if (line.includes('---')) continue;
      if (line.includes('Metric')) continue;
      if (line.trim() === '|') continue;

      const parts = line.split('|').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 4 && parts[0] !== 'Metric') {
        rules.push({
          adrNumber: adr.number,
          title: adr.title,
          category: adr.category,
          section: currentSection,
          rule: `${parts[0]}: ${parts[1]} minimum threshold is ${parts[2]}`,
          type: 'MUST',
        });
      }
    }

    // Implementation section: Extract bullet points with bold keys
    if (currentSection.toLowerCase() === 'implementation' && (line.startsWith('*') || line.startsWith('-'))) {
      rules.push({
        adrNumber: adr.number,
        title: adr.title,
        category: adr.category,
        section: currentSection,
        rule: line.replace(/^[*#-]\s*\*\*?([^*:]+):?\*\*\s*/, '$1: ').trim(),
        type: 'MUST',
      });
    }
  }

  // Add "The Decision" as a high-level info
  const decisionMatch = adr.content.match(/#### The Decision\s*\n([\s\S]+?)(?=####|$)/);
  if (decisionMatch) {
    const decisionText = decisionMatch[1].split('\n').filter(l => l.trim() && !l.startsWith('*')).slice(0, 3).join(' ').trim();
    if (decisionText && decisionText.length > 10) {
      rules.push({
        adrNumber: adr.number,
        title: adr.title,
        category: adr.category,
        section: 'The Decision',
        rule: decisionText,
        type: 'INFO',
      });
    }
  }

  return rules;
}

function classifyRule(rule: string): AgentRule['type'] {
  const lower = rule.toLowerCase();
  if (lower.includes('must') || lower.includes('never') || lower.includes('non-negotiable')) {
    return 'MUST';
  }
  if (lower.includes('should') || lower.includes('prefer')) {
    return 'SHOULD';
  }
  if (lower.includes('do not') || lower.includes('avoid') || lower.includes('forbidden')) {
    return 'MUST NOT';
  }
  // Default MUST for extracted bullet rules
  return 'MUST';
}

// ============================================================================
// GENERATOR: Build ADR-summary.md from rules
// ============================================================================

interface Section {
  category: string;
  rules: AgentRule[];
}

function categorizeRules(rules: AgentRule[]): Section[] {
  const categories = new Map<string, AgentRule[]>();

  // Rules now have category embedded - just group by it
  for (const rule of rules) {
    categories.set(rule.category, [...(categories.get(rule.category) || []), rule]);
  }

  return Array.from(categories.entries()).map(([category, rules]) => ({ category, rules }));
}

function generateAgentsMarkdown(): string {
  const adrMarkdown = require('fs').readFileSync(ADR_PATH, 'utf-8');
  const adrs = parseADRs(adrMarkdown)
    .filter(a => a.status === 'Accepted' || a.status === 'Proposed');

  const allRules = adrs.flatMap(extractRules);
  const sections = categorizeRules(allRules);

  let output = `# ADR Extracts for AI Agents

This document is **GENERATED** from \`docs/ARCHITECTURE_DECISIONS.md\`.
DO NOT EDIT MANUALLY - Changes will be overwritten on next sync.

Last generated: ${new Date().toISOString()}

---

`;

  for (const section of sections) {
    output += `## ${section.category}\n\n`;

    for (const rule of section.rules) {
      const emoji = rule.type === 'MUST' ? '✅' : rule.type === 'MUST NOT' ? '⛔' : rule.type === 'SHOULD' ? '💭' : 'ℹ️';
      output += `${emoji} **[${rule.type}]** ${escapeMarkdown(rule.rule)}\n`;
      output += `   *ADR-${rule.adrNumber}: ${escapeMarkdown(rule.title)}* (${rule.section})\n\n`;
    }
  }

  return output;
}

function escapeMarkdown(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const output = generateAgentsMarkdown();
  await fs.writeFile(ADR_EXTRACTS_PATH, output, 'utf-8');
  console.log(`✅ Generated ${ADR_EXTRACTS_PATH}`);
  console.log(`   Run: git diff ${path.relative(process.cwd(), ADR_EXTRACTS_PATH)} to review changes`);
}

main().catch(console.error);
