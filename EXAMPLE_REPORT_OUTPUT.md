# Example: Report Output Before and After

## Before: Current Report Output

Tests appear as simple names without business context:

```
├─ Preconditions: Input Validation & Edge Cases
│  ├─ Precondition: Empty cart results in zero totals ✅ PASS
│  ├─ Precondition: Exactly 2 items (boundary condition) gets no bulk discount ✅ PASS
│  └─ Precondition: Exactly 3 items (boundary condition) gets bulk discount ✅ PASS
```

**Problem:** Stakeholders don't know which business rule validates or why these edge cases matter.

## After: Enhanced Report Output

Tests display structured metadata with business context:

```
├─ Preconditions: Input Validation & Edge Cases
│  ├─ Precondition: Empty cart results in zero totals ✅ PASS
│  │  └─ Business Rule: pricing-strategy.md §1 - Base Rules
│  │     Scenario: Edge case: Empty cart should not crash, should only charge shipping
│  │     Tags: @precondition @boundary @input-validation
│  │
│  ├─ Precondition: Exactly 2 items (boundary condition) gets no bulk discount ✅ PASS
│  │  └─ Business Rule: pricing-strategy.md §2 - Bulk Discounts
│  │     Scenario: Critical boundary: quantity = 2 (just below bulk threshold of 3)
│  │     Tags: @precondition @pricing @boundary @bulk-discount
│  │
│  └─ Precondition: Exactly 3 items (boundary condition) gets bulk discount ✅ PASS
│     └─ Business Rule: pricing-strategy.md §2 - Bulk Discounts
│        Scenario: Critical boundary: quantity = 3 (exactly at bulk threshold, MUST get discount)
│        Tags: @precondition @pricing @boundary @bulk-discount @critical
```

## Visual HTML Representation

### Test with Metadata (Styled)

```html
<td>
  <strong>Precondition: Exactly 3 items (boundary condition) gets bulk discount</strong>

  <div class="test-metadata">
    <div class="metadata-row">
      <span class="metadata-label">Business Rule:</span>
      <span class="metadata-value">pricing-strategy.md §2 - Bulk Discounts</span>
    </div>
    <div class="metadata-row">
      <span class="metadata-label">Scenario:</span>
      <span class="metadata-value">Critical boundary: quantity = 3 (exactly at bulk threshold, MUST get discount)</span>
    </div>
    <div class="metadata-row">
      <span class="metadata-label">Tags:</span>
      <span class="tags">
        <span class="tag">@precondition</span>
        <span class="tag">@pricing</span>
        <span class="tag">@boundary</span>
        <span class="tag">@critical</span>
      </span>
    </div>
  </div>
</td>
```

### Rendered Appearance

**Precondition: Exactly 3 items (boundary condition) gets bulk discount**

<div style="font-size: 0.85em; margin-top: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px; border: 1px solid #e1e4e8;">
  <div style="margin-bottom: 4px;">
    <span style="font-weight: 600; color: #666; margin-right: 6px;">Business Rule:</span>
    <span style="color: #333;">pricing-strategy.md §2 - Bulk Discounts</span>
  </div>
  <div style="margin-bottom: 4px;">
    <span style="font-weight: 600; color: #666; margin-right: 6px;">Scenario:</span>
    <span style="color: #333;">Critical boundary: quantity = 3 (exactly at bulk threshold, MUST get discount)</span>
  </div>
  <div>
    <span style="font-weight: 600; color: #666; margin-right: 6px;">Tags:</span>
    <span style="display: inline-flex; flex-wrap: wrap; gap: 4px;">
      <span style="background: #e1f5ff; color: #0066cc; padding: 2px 6px; border-radius: 3px; font-size: 0.9em;">@precondition</span>
      <span style="background: #e1f5ff; color: #0066cc; padding: 2px 6px; border-radius: 3px; font-size: 0.9em;">@pricing</span>
      <span style="background: #e1f5ff; color: #0066cc; padding: 2px 6px; border-radius: 3px; font-size: 0.9em;">@boundary</span>
      <span style="background: #e1f5ff; color: #0066cc; padding: 2px 6px; border-radius: 3px; font-size: 0.9em;">@critical</span>
    </span>
  </div>
</div>

## Code Pattern for Developers

```typescript
it('Precondition: Exactly 3 items (boundary condition) gets bulk discount', () => {
  // Register structured metadata (appears in reports)
  registerPrecondition({
    name: 'Precondition: Exactly 3 items (boundary condition) gets bulk discount',
    ruleReference: 'pricing-strategy.md §2 - Bulk Discounts',
    scenario: 'Critical boundary: quantity = 3 (exactly at bulk threshold, MUST get discount)',
    tags: ['@precondition', '@pricing', '@boundary', '@critical']
  });

  // Inline comment still exists for code readability (not DRY violation)
  // Validates: pricing-strategy.md §2 - Bulk Discounts
  // Critical boundary: quantity = 3 (exactly at bulk threshold, MUST get discount)

  const cart: CartItem[] = [{
    sku: 'EXACTLY_3',
    name: 'Exactly 3 Items',
    price: 5000,
    quantity: 3,
    weightInKg: 1.0
  }];
  const user: User = { tenureYears: 0 };

  const result = PricingEngine.calculate(cart, user);

  expect(result.volumeDiscountTotal).toBe(2250); // 15000 * 0.15
  expect(result.lineItems[0].bulkDiscount).toBe(2250);
});
```

## Key Improvements

1. **Business Rule Traceability**: Direct links to pricing-strategy.md sections
2. **Intent Documentation**: Explains WHY each edge case matters
3. **Tag-Based Organization**: Enables filtration by domain and importance
4. **Professional Presentation**: Metadata appears as structured data, not code comments
5. **Stakeholder-Friendly**: Non-developers understand what's being validated and why
