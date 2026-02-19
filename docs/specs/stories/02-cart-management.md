# Domain: Cart Management

## Business Standards

### Conversion Funnel Economics

**The cart IS the revenue conversion point.**

Every friction point in the cart directly reduces conversion:
- Alert dialogs create modal interruption → abandonment
- Missing visual feedback → user confusion → abandonment
- Cart not persisting → lost opportunity to return and complete

**Industry benchmarks:**
- Average e-commerce cart abandonment rate: ~70%
- Every 1 second of delay increases abandonment by ~7%
- Modal interruptions can increase abandonment by 20%+

### Internal UX Principles

1. **No Blocking Alerts:** Add-to-cart should be seamless
2. **Clear Feedback:** User should see cart badge update immediately
3. **Persistence:** Cart survives page refresh, close/open
4. **Price Integrity:** Price saved at add-time, not current live price

### Why This Matters

- **Recovery cost:** Recovering abandoned carts is expensive (email campaigns, discounts)
- **First impression:** Technical issues at add-to-cart damage brand trust
- **Lifetime value:** Smooth cart experience encourages repeat purchases

### Current Issue Identified

Clicking "Add to Cart" in `ProductDetailPage.tsx`:
- Shows an alert (blocking, bad UX)
- Dispatches an event that nothing listens to
- Cart state is NOT actually updated

---

## Domain Concepts

### Core Entities

| Entity | Attribute | Type | Description |
|--------|-----------|------|-------------|
| **CartItem** | `sku` | string | Product identifier (primary) |
| | `quantity` | number | Items in cart |
| | `priceInCents` | number | Price AT TIME OF ADD (preserved) |
| | `weightInKg` | number | For shipping calculation |
| **CartItemWithMetadata** | (extends CartItem) | | Added for analytics |
| | `addedAt` | Date | When item was added |
| **CartState** | `items` | CartItemWithMetadata[] | All items in cart |
| | `user` | User \| null | Current logged-in user |
| | `shippingMethod` | ShippingMethod | Selected shipping option |
| | `pricingResult` | PricingResult \| null | Cached pricing calculation |

### Derived Concepts

| Concept | Rule |
|---------|------|
| **Cart Badge Count** | SUM(item.quantity) for all items |
| **Cart Subtotal** | SUM(item.priceInCents × item.quantity) |
| **Price Preservation** | Price saved at add-time, never updated |

### Ubiquitous Language

| Term | Definition |
|-------|------------|
| "Add to Cart" | User action to put item in their shopping cart |
| "Cart Badge" | The number displayed on cart icon showing item count |
| "Merge" | When adding existing SKU, increase quantity, don't add duplicate |
| "Persistence" | Cart saved to localStorage, survives reload |

### Invariants

1. **No Duplicate SKUs:** Each SKU appears at most once in cart
2. **Quantity Non-negative:** All item quantities ≥ 1 (removing deletes when 0)
3. **Preserved Pricing:** `item.priceInCents` never changes after add
4. **Badge Accuracy:** Badge count = total quantity across all items
5. **Timestamp Ordering:** Items sorted by `addedAt` descending (newest first)
6. **Empty Store Validity:** Empty cart is a valid state, not an error

---

## Workflow

### Adding Items to Cart

```
1. User views ProductDetailPage
   └─ Sees product info, price, add-to-cart button

2. User clicks "Add to Cart"
   └─ Button disabled briefly to prevent double-submit

3. Store receives addItem({ sku, quantity, priceInCents, weightInKg })
   ├─ Check if SKU already exists in items array
   ├─ If exists: increment existing item's quantity
   └─ If new: append new item with addedAt = now()

4. localStorage persist() triggered автоматически by Zustand middleware

5. Cart badge updates (reactive)

6. Visual feedback shown (toast/notification, not alert)
```

### Removing Items

```
1. User clicks "Remove" on cart item
   └─ removeItem(sku)

2. Item removed from items array

3. localStorage updated

4. Cart badge decreases
```

### Updating Quantity

```
1. User adjusts quantity input in cart
   ├─ If quantity > 0: updateQuantity(sku, newQuantity)
   └─ If quantity = 0 or -: removeItem(sku)

2. Item quantity updated

3. localStorage updated
```

### Cart Persistence

```
On Page Load:
1. Check localStorage for stored cart
2. If found: hydrate Zustand store
3. Cart badge shows saved count automatically

On Every Change:
1. Zustand persist middleware automatically saves
2. No manual localStorage calls needed
```

### Decision Points

| Decision | Condition | Outcome |
|----------|-----------|---------|
| Merge vs. Duplicate | SKU exists in cart | Increment quantity |
| Remove vs. Update | Quantity becomes 0 | Remove item entirely |
| Free shipping check | Cart total > $100 | Show "Free shipping" badge |

---

## Scenario Mapping

| Scenario | Action | Expected Result |
|----------|--------|-----------------|
| **Add single item** | Click "Add to Cart" | Item added, badge = 1 |
| **Add same SKU twice** | Add, then add again | Quantity = 2, badge = 2 (1 item) |
| **Add different SKUs** | Add product A, then B | Two items, badge = 2 |
| **Remove item** | Click remove | Item gone, badge decreases |
| **Update to zero** | Set quantity to 0 | Item removed |
| **Update quantity** | Change from 1 to 5 | Badge increases by 4 |
| **Clear cart** | Clear all items | Badge = 0, items empty |
| **Page reload** | Refresh with items | Cart restored, badge shows count |
| **Price changes live** | Product price updated after add | Cart shows ORIGINAL price (preserved) |

### Edge Cases

| Scenario | What to Handle |
|----------|----------------|
| Add quantity 0 | Ignore or treat as non-action |
| Negative quantity | Reject, do nothing |
| Very high quantity | Allow (user wants bulk discount) |
| Empty cart | Badge shows 0, no errors |
| Corrupted localStorage | Fallback to empty cart |

---

## Test Specifications

### E2E Tests (Already Exists)

**Location:** `implementations/executable-specs/e2e/src/test/e2e/cart.ui.properties.test.ts`

| Test | Current Status | Required Update |
|------|----------------|-----------------|
| Cart badge shows correct count | ✅ Exists | |
| Cart allows removing items | ✅ Exists | |
| Cart allows quantity updates | ✅ Exists | |
| Add to cart preserves price | ✅ Exists | |
| Multiple adds merge correctly | ✅ Exists | |
| Cart survives page reload | ✅ Exists | |

### Unit Tests (To Be Created)

**Location:** `implementations/executable-specs/unit/test/cart-store.spec.ts`

| Test | Description |
|------|-------------|
| addItem creates new item | New SKU added correctly |
| addItem merges existing SKU | Quantity increments, not duplicate |
| addItem preserves timestamp | addedAt set correctly |
| removeItem removes item | Item removed from array |
| updateQuantity changes value | Quantity updated correctly |
| updateQuantity to zero removes | Item removed when quantity 0 |
| clear empties cart | All items removed |
| localStorage persistence | Changes persist to localStorage |
| localStorage hydration | Cart restored from localStorage |

### Component Tests (To Be Created)

**Location:** `implementations/executable-specs/e2e/src/test/components/ProductDetailPage.spec.ts`

| Test | Description |
|------|-------------|
| Add to cart button calls store | Store.addItem() invoked |
| Add to cart shows feedback | Visual feedback (not alert) |
| Button disabled during add | Prevents double-submit |

---

## Technical Implementation

### Where the Code Lives

| Component | Location | Status |
|-----------|----------|--------|
| Cart Store | `implementations/executable-specs/e2e/src/store/cartStore.ts` | ✅ Exists, complete |
| Cart Components | `implementations/executable-specs/e2e/src/components/cart/` | ✅ Exists |
| Product Detail Page | `implementations/executable-specs/e2e/src/pages/ProductDetailPage.tsx` | ✅ Complete |
| E2E Tests | `implementations/executable-specs/e2e/src/test/e2e/cart.ui.properties.test.ts` | ✅ Complete |
| Unit Tests | `implementations/executable-specs/unit/test/cart-store.spec.ts` | ❌ To be created |

### Store Interface

```typescript
interface CartState {
  items: CartItemWithMetadata[];
  user: User | null;
  shippingMethod: ShippingMethod;
  pricingResult: PricingResult | null;

  // Actions
  addItem: (item: Pick<CartItem, 'sku' | 'priceInCents' | 'quantity' | 'weightInKg'>) => void;
  removeItem: (sku: string) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  setUser: (user: User | null) => void;
  setShippingMethod: (method: ShippingMethod) => void;
  setPricingResult: (result: PricingResult | null) => void;
  clear: () => void;
}
```

### Current Bug in ProductDetailPage

In `ProductDetailPage.tsx`, the "Add to Cart" handler:

```typescript
const handleAddToCart = () => {
  alert(`${product.name} added to cart!`); // ❌ Blocking alert
  window.dispatchEvent(new CustomEvent('cart:updated', { // ❌ Nothing listens
    detail: { sku: product.sku, quantity }
  }));
};
```

**Required Fix:**

```typescript
const handleAddToCart = () => {
  cartStore.addItem({
    sku: product.sku,
    priceInCents: product.priceInCents,
    quantity,
    weightInKg: product.weightInKg,
  });
  // Optional: Show toast notification
};
```

---

## Completion Criteria

This domain is complete when:

- [x] All domain specs documented
- [x] Add to Cart actually updates store (not just alert)
- [x] Cart badge always reflects accurate count
- [x] Add identical SKUs merges (quantity increment)
- [x] Price preserved at add-time
- [x] Cart persists across page reloads
- [x] All E2E tests pass with real store mutations
- [x] Unit tests for cart store written and passing
- [ ] Attestation reports show full coverage

---

## References

- `DEEP_DOMAIN_UNDERSTANDING.md` - Methodology
- `docs/TESTING_FRAMEWORK.md` - Testing standards
- `README_AUDIT_FINDINGS.md` - Bug documentation
