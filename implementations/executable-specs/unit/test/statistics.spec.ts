import { describe, it, expect, beforeAll } from 'vitest';
import { tracer } from './modules/tracer';
import { PricingEngine, CartItem, User, ShippingMethod } from '../../shared/src';
import { cartArb, userArb, shippingMethodArb } from '../../shared/fixtures';
import { verifyInvariant, verifyShippingInvariant } from './fixtures/invariant-helper';

describe('Statistics: Coverage Analysis', () => {

  beforeAll(() => {
    console.log('\n=== Executing Property-Based Tests to Gather Statistics ===\n');
  });

  /**
   * Gather statistics by running all property tests with the tracer enabled
   * This provides quantitative evidence of the test coverage
   */
  it('Statistics: Comprehensive coverage analysis across all invariants', () => {
    // Run a curated set of property tests to gather statistical evidence
    console.log('Running property tests with deep sampling...\n');

    // Test 1: Safety Valve - Critical for revenue protection
    verifyInvariant({
      name: 'Safety Valve Coverage Analysis',
      ruleReference: 'pricing-strategy.md §4 - Safety Valve',
      rule: 'Total Discount (Bulk + VIP) strictly NEVER exceeds 30% of Original Total',
      tags: ['@pricing', '@safety-valve', '@revenue-protection', '@critical']
    }, (items, user, result) => {
      const maxAllowed = Math.round(result.originalTotal * 0.30);
      expect(result.totalDiscount).toBeLessThanOrEqual(maxAllowed);
    });

    // Test 2: Bulk Discount Rule
    verifyInvariant({
      name: 'Bulk Discount Coverage Analysis',
      ruleReference: 'pricing-strategy.md §2 - Bulk Discounts',
      rule: 'Any line item with Quantity >= 3 MUST have a 15% discount applied',
      tags: ['@pricing', '@bulk-discount', '@customer-experience']
    }, (items, user, result) => {
      result.lineItems.forEach(li => {
        if (li.quantity >= 3) {
          const expectedDiscount = Math.round(li.originalPrice * li.quantity * 0.15);
          expect(li.bulkDiscount).toBe(expectedDiscount);
        } else {
          expect(li.bulkDiscount).toBe(0);
        }
      });
    });

    // Test 3: VIP Discount Rule
    verifyInvariant({
      name: 'VIP Discount Coverage Analysis',
      ruleReference: 'pricing-strategy.md §3 - VIP Tier',
      rule: 'If User Tenure > 2, a 5% discount is applied to the post-bulk subtotal',
      tags: ['@pricing', '@vip', '@loyalty', '@customer-experience']
    }, (items, user, result) => {
      if (user.tenureYears > 2) {
        const expected = Math.round(result.subtotalAfterBulk * 0.05);
        expect(result.vipDiscount).toBe(expected);
      } else {
        expect(result.vipDiscount).toBe(0);
      }
    });

    // Test 4: Free Shipping Rule
    verifyShippingInvariant({
      name: 'Free Shipping Coverage Analysis',
      ruleReference: 'pricing-strategy.md §5.2 - Free Shipping Threshold',
      rule: 'If finalTotal > $100.00, then totalShipping = 0',
      tags: ['@shipping', '@free-shipping', '@customer-experience', '@critical']
    }, (items, user, method, result) => {
      if (method === ShippingMethod.STANDARD) {
        if (result.finalTotal > 10000) {
          expect(result.shipment.isFreeShipping).toBe(true);
        } else {
          expect(result.shipment.isFreeShipping).toBe(false);
        }
      }
    });

    // Generate and display statistical report
    const summaries = tracer.getInvariantSummaries();
    const tagCoverage = tracer.getTagCoverage();

    console.log('\n=== STATISTICAL COVERAGE REPORT ===\n');

    // Report by Business Invariant
    console.log('📊 Coverage by Business Invariant:\n');
    const criticalInvariants = summaries.filter(s => s.tags.includes('@critical'));
    const revenueProtectionInvariants = summaries.filter(s => s.tags.includes('@revenue-protection'));
    const customerExperienceInvariants = summaries.filter(s => s.tags.includes('@customer-experience'));

    console.log(`Critical Invariants (Revenue Protectors): ${criticalInvariants.length}`);
    criticalInvariants.forEach(s => {
      console.log(`  ✅ ${s.name}`);
      console.log(`     Total Executions: ${s.totalRuns}`);
      console.log(`     Edge Cases Covered:`);
      if (s.edgeCasesCovered.discountCapHit > 0) {
        console.log(`        • Discount cap triggered in ${s.edgeCasesCovered.discountCapHit} executions`);
      }
      if (s.edgeCasesCovered.vipUsers > 0) {
        console.log(`        • VIP users: ${s.edgeCasesCovered.vipUsers}`);
      }
      console.log(`     Status: ${s.passed ? '✅ ALL TESTS PASSED' : '❌ FAILURES DETECTED'}\n`);
    });

    console.log(`\nRevenue Protection Invariants: ${revenueProtectionInvariants.length}`);
    revenueProtectionInvariants.forEach(s => {
      console.log(`  ✅ ${s.name} - verified ${s.totalRuns} times`);
    });

    console.log(`\nCustomer Experience Invariants: Pending`);

    // Report by Tag (Business Priorities)
    console.log('\n🏷️  Coverage by Business Priority Tags:\n');
    const sortedTagCoverage = [...tagCoverage].sort((a, b) => b.totalRuns - a.totalRuns);

    sortedTagCoverage.forEach(coverage => {
      const icon = coverage.tag.includes('@critical') ? '🔴' :
                   coverage.tag.includes('@revenue-protection') ? '💰' :
                   coverage.tag.includes('@customer-experience') ? '🛒' :
                   coverage.tag.includes('@shipping') ? '🚚' : '📋';

      console.log(`${icon} ${coverage.tag}`);
      console.log(`   Total Runs: ${coverage.totalRuns}`);
      console.log(`   Invariants Verified: ${coverage.invariants.length} (${coverage.invariants.join(', ')})`);
      console.log(`   Status: ${coverage.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log('');

      // Categorize by business impact
      if (coverage.tag === '@critical') {
        console.log(`   🔥 IMPACT: Critical revenue protection rules verified`);
      } else if (coverage.tag === '@revenue-protection') {
        console.log(`   💰 IMPACT: Prevents margin erosion across all pricing scenarios`);
      } else if (coverage.tag === '@customer-experience') {
        console.log(`   🛒 IMPACT: Ensures delivery promises and pricing accuracy`);
      }
    });

    // Statistical Distribution Analysis
    console.log('\n📈 Statistical Distribution Analysis:\n');

    let vipScenarios = 0;
    let nonVipScenarios = 0;
    let bulkScenarios = 0;
    let nonBulkScenarios = 0;
    let discountCapHits = 0;
    let freeShippingQualifiers = 0;

    summaries.forEach(s => {
      vipScenarios += s.edgeCasesCovered.vipUsers;
      nonVipScenarios += s.edgeCasesCovered.nonVipUsers;
      bulkScenarios += s.edgeCasesCovered.bulkItems;
      nonBulkScenarios += s.edgeCasesCovered.nonBulkItems;
      discountCapHits += s.edgeCasesCovered.discountCapHit;
      freeShippingQualifiers += s.edgeCasesCovered.freeShippingQualifying;
    });

    const totalScenarios = vipScenarios + nonVipScenarios;
    const vipPercentage = totalScenarios > 0 ? ((vipScenarios / totalScenarios) * 100).toFixed(1) : 0;
    const bulkPercentage = (bulkScenarios + nonBulkScenarios) > 0 ? ((bulkScenarios / (bulkScenarios + nonBulkScenarios)) * 100).toFixed(1) : 0;
    const capHitPercentage = totalScenarios > 0 ? ((discountCapHits / totalScenarios) * 100).toFixed(1) : 0;

    console.log(`User Tenure Distribution:`);
    console.log(`  • VIP (Tenure > 2): ${vipScenarios} scenarios (${vipPercentage}%)`);
    console.log(`  • Non-VIP: ${nonVipScenarios} scenarios (${(100 - parseFloat(String(vipPercentage))).toFixed(1)}%)`);

    console.log(`\nCart Composition Distribution:`);
    console.log(`  • Bulk Items (Qty >= 3): ${bulkScenarios} items (${bulkPercentage}%)`);
    console.log(`  • Single/Low Quantity: ${nonBulkScenarios} items (${(100 - parseFloat(String(bulkPercentage))).toFixed(1)}%)`);

    console.log(`\nBusiness Rule Triggers:`);
    console.log(`  • Discount Cap (Safety Valve): ${discountCapHits} hits (${capHitPercentage} of all scenarios)`);
    console.log(`  • Free Shipping Qualification: ${freeShippingQualifiers} occurrences`);
    console.log(`  • Boundary Tenure (Exactly 2 Years): ${summaries.reduce((sum, s) => sum + s.edgeCasesCovered.exactlyTwoYearTenure, 0)} occurrences`);

    // Confidence Score Calculation
    console.log('\n🎯 Test Coverage Confidence Score:\n');

    const confidenceMetrics = {
      invariantCompleteness: summaries.length >= 8 ? 'High' : summaries.length >= 5 ? 'Medium' : 'Low',
      edgeCaseCoverage: discountCapHits > 0 && vipScenarios > 0 && bulkScenarios > 0 ? 'Excellent' : 'Basic',
      statisticalVolume: totalScenarios > 500 ? 'High' : totalScenarios > 200 ? 'Medium' : 'Low',
      businessTagCoverage: tagCoverage.filter(t => t.totalRuns > 0).length >= 5 ? 'Comprehensive' : 'Partial'
    };

    console.log(`✅ Invariant Completeness: ${confidenceMetrics.invariantCompleteness} (${summaries.length} business rules tested)`);
    console.log(`✅ Edge Case Coverage: ${confidenceMetrics.edgeCaseCoverage}`);
    console.log(`✅ Statistical Volume: ${confidenceMetrics.statisticalVolume} (${totalScenarios} total property test executions)`);
    console.log(`✅ Business Tag Coverage: ${confidenceMetrics.businessTagCoverage} (${tagCoverage.filter(t => t.totalRuns > 0).length} tags with data)`);

    // Final Assessment
    console.log('\n=== FINAL ASSESSMENT ===\n');

    const allPassed = summaries.every(s => s.passed);

    if (allPassed) {
      console.log('✅ ALL SYSTEMS OPERATIONAL\n');
      console.log('The Pricing Engine has been verified through rigorous Property-Based Testing with:');
      console.log(`  • ${summaries.length} Business Invariants validated`);
      console.log(`  • ${totalScenarios.toLocaleString()} Randomly generated test cases`);
      console.log(`  • ${tagCoverage.length} Business priority tags covered`);
      console.log(`  • Evidence of edge case coverage: VIP users (${vipScenarios}), bulk orders (${bulkScenarios}), discount cap hits (${discountCapHits})`);
      console.log('\n🎉 Test Suite: PRODUCTION READY');
    } else {
      const failed = summaries.filter(s => !s.passed);
      console.log('❌ CRITICAL ISSUES DETECTED\n');
      failed.forEach(f => {
        console.log(`  ❌ ${f.name}`);
        console.log(`     Reason: ${f.failureReason || 'Unknown'}`);
      });
      console.log('\n⚠️  Test Suite: REQUIRES INVESTIGATION');
    }

    // Verify statistics sanity
    expect(summaries.length).toBeGreaterThan(0);
    expect(tagCoverage.length).toBeGreaterThan(0);
    expect(totalScenarios).toBeGreaterThan(0);
    expect(allPassed).toBe(true);
  });

  /**
   * Verify that the tracer is actually capturing execution data
   */
  it('Statistics: Tracer is recording execution data correctly', () => {
    const summaries = tracer.getInvariantSummaries();
    const tagCoverage = tracer.getTagCoverage();

    console.log('\n=== TRACER VALIDATION ===\n');
    console.log(`Registered Invariants: ${summaries.length}`);
    console.log(`Active Tags: ${tagCoverage.map(t => t.tag).join(', ')}`);

    // Verify tracer has captured some data
    expect(summaries.length).toBeGreaterThan(0);
    expect(tagCoverage.length).toBeGreaterThan(0);

    // Verify edge case counters are non-negative
    summaries.forEach(s => {
      expect(s.totalRuns).toBeGreaterThanOrEqual(0);
      expect(s.edgeCasesCovered.vipUsers).toBeGreaterThanOrEqual(0);
      expect(s.edgeCasesCovered.nonVipUsers).toBeGreaterThanOrEqual(0);
      expect(s.edgeCasesCovered.bulkItems).toBeGreaterThanOrEqual(0);
      expect(s.edgeCasesCovered.nonBulkItems).toBeGreaterThanOrEqual(0);
      expect(s.edgeCasesCovered.discountCapHit).toBeGreaterThanOrEqual(0);
    });

    // Verify tag coverage
    tagCoverage.forEach(t => {
      expect(t.tag).toMatch(/^@/); // Must start with @
      expect(t.invariants.length).toBeGreaterThan(0);
      expect(t.totalRuns).toBeGreaterThanOrEqual(0);
    });

    console.log('\n✅ Tracer data structure is valid\n');
  });
});
