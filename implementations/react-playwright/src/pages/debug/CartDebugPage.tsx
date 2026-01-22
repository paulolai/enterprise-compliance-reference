import { useEffect, useState } from 'react';
import { CartPage } from '../CartPage';
import { useCartStore } from '../../store/cartStore';
import { CartBuilder } from '../../../../shared/fixtures';
import { ShippingMethod } from '../../../../shared/src';

/**
 * Debug Page for Visual Debugging of Cart States
 *
 * This page allows developers to quickly see the UI for various cart scenarios
 * without navigating through the application. URL parameters control the scenario.
 *
 * Usage:
 *   /debug/cart-view?tenureYears=5&quantity=3
 *   /debug/cart-view?scenario=vip-bulk
 *   /debug/cart-view?scenario=bundle
 *
 * This is particularly useful for:
 * - Visual regression testing
 * - UX design review
 * - Quick verification of UI components
 */
export function CartDebugPage() {
  const [initialized, setInitialized] = useState(false);
  const searchParams = new URLSearchParams(window.location.search);
  const scenario = searchParams.get('scenario') || 'custom';

  useEffect(() => {
    // Only initialize once
    if (initialized) return;

    let items;
    let user;

    switch (scenario) {
      case 'vip':
        // VIP user with single item
        const vipBuilder = CartBuilder.new()
          .withItem({ name: 'Laptop Pro', price: 89900, quantity: 1 })
          .withTenure(5);
        const vipInput = vipBuilder.getInputs();
        items = vipInput.items;
        user = { ...vipInput.user, email: 'vip@test.com', name: 'VIP Customer' };
        break;

      case 'bulk':
        // Regular user with bulk quantity (triggering bulk discount)
        const bulkBuilder = CartBuilder.new()
          .withItem({ name: 'Wireless Earbuds', price: 8900, quantity: 5 });
        const bulkInput = bulkBuilder.getInputs();
        items = bulkInput.items;
        user = { ...bulkInput.user, email: 'regular@test.com', name: 'Regular Customer' };
        break;

      case 'vip-bulk':
        // VIP user with bulk items (both discounts)
        const vipBulkBuilder = CartBuilder.new()
          .withItem({ name: 'Smart Watch', price: 24900, quantity: 4 })
          .withTenure(5);
        const vipBulkInput = vipBulkBuilder.getInputs();
        items = vipBulkInput.items;
        user = { ...vipBulkInput.user, email: 'vip@test.com', name: 'VIP Customer' };
        break;

      case 'bundle':
        // Multiple items with mixed attributes
        const bundleBuilder = CartBuilder.new()
          .withItem({ name: 'Wireless Earbuds', price: 8900, quantity: 4 })
          .withItem({ name: 'T-Shirt Basic', price: 2500, quantity: 2 })
          .withTenure(5);
        const bundleInput = bundleBuilder.getInputs();
        items = bundleInput.items;
        user = { ...bundleInput.user, email: 'vip@test.com', name: 'VIP Customer' };
        break;

      case 'free-shipping':
        // Just over free shipping threshold
        const freeShipBuilder = CartBuilder.new()
          .withItem({ name: 'Tablet', price: 49900, quantity: 3 });
        const freeShipInput = freeShipBuilder.getInputs();
        items = freeShipInput.items;
        user = { ...freeShipInput.user, email: 'regular@test.com', name: 'Regular Customer' };
        break;

      case 'empty':
        // Empty cart
        items = [];
        user = { email: 'regular@test.com', name: 'Regular Customer', tenureYears: 0 };
        break;

      case 'discount-cap':
        // High value to trigger discount cap warning
        const capBuilder = CartBuilder.new()
          .withItem({ name: 'High-Value Item', price: 50000, quantity: 20 })
          .withTenure(10);
        const capInput = capBuilder.getInputs();
        items = capInput.items;
        user = { ...capInput.user, email: 'vip@test.com', name: 'VIP Customer' };
        break;

      case 'custom':
      default:
        // Custom parameters from URL
        const tenureYears = parseInt(searchParams.get('tenureYears') || '0');
        const quantity = parseInt(searchParams.get('quantity') || '1');
        const price = parseInt(searchParams.get('price') || '10000');

        const customBuilder = CartBuilder.new()
          .withItem({ name: 'Custom Item', price, quantity })
          .withTenure(tenureYears);
        const customInput = customBuilder.getInputs();
        items = customInput.items;
        user = { ...customInput.user, email: `debug-${tenureYears}yrs@test.com`, name: `${tenureYears > 2 ? 'VIP' : 'Regular'} Customer` };
    }

    // Override store for debug mode
    useCartStore.setState({
      items: items.map((item: any) => ({ ...item, addedAt: Date.now() })),
      user,
      shippingMethod: ShippingMethod.STANDARD,
      pricingResult: null
    });

    setInitialized(true);
  }, [scenario, initialized]);

  if (!initialized) {
    return <div className="p-8">Loading debug scenario: {scenario}...</div>;
  }

  return (
    <div className="debug-page">
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-amber-700">
              <strong>Debug Mode:</strong> Scenario: {scenario}. Change URL parameters to try different states.
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Available scenarios: vip, bulk, vip-bulk, bundle, free-shipping, empty, discount-cap, custom
            </p>
          </div>
        </div>
      </div>
      <CartPage />
    </div>
  );
}
