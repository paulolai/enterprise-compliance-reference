import { useEffect, useState } from 'react';
import { CheckoutPage } from '../CheckoutPage';
import { useCartStore } from '../../store/cart-store';
import { authClient } from '../../lib/auth';
import { CartBuilder } from '../../../../shared/fixtures';
import { ShippingMethod } from '../../../../shared/src';
import type { CartItem, User } from '../../../../shared/src';

/**
 * Debug Page for Visual Debugging of Checkout States
 *
 * This page allows developers to quickly see the UI for various checkout scenarios
 * without navigating through the application. URL parameters control the scenario.
 *
 * Usage:
 *   /debug/checkout?scenario=standard
 *   /debug/checkout?scenario=free-shipping
 *   /debug/checkout?scenario=express-shipping
 *
 * This is particularly useful for:
 * - Visual regression testing
 * - UX design review
 * - Quick verification of shipping UI components
 */
export function CheckoutDebugPage() {
  const [isReady, setIsReady] = useState(false);
  const searchParams = new URLSearchParams(window.location.search);
  const scenario = searchParams.get('scenario') || 'standard';

  useEffect(() => {
    let items: CartItem[];
    let user: User;
    let shipping: ShippingMethod = ShippingMethod.STANDARD;

    switch (scenario) {
      case 'heavy-cart': {
        const heavyBuilder = CartBuilder.new()
          .withItem({ name: 'Wireless Earbuds', price: 8900, quantity: 4 })
          .withItem({ name: 'Smart Watch', price: 24900, quantity: 2 })
          .withTenure(5);
        const heavyInput = heavyBuilder.getInputs();
        items = heavyInput.items;
        user = { ...heavyInput.user, email: 'vip@test.com', name: 'VIP Customer' };
        break;
      }

      case 'free-shipping-threshold': {
        // Just at threshold - should NOT qualify
        const thresholdBuilder = CartBuilder.new()
          .withItem({ name: 'Tablet', price: 10000, quantity: 10 });
        const thresholdInput = thresholdBuilder.getInputs();
        items = thresholdInput.items;
        user = { ...thresholdInput.user, email: 'regular@test.com', name: 'Regular Customer' };
        break;
      }

      case 'free-shipping-qualified': {
        // Just over threshold - SHOULD qualify
        const qualifiedBuilder = CartBuilder.new()
          .withItem({ name: 'Tablet', price: 10000, quantity: 11 });
        const qualifiedInput = qualifiedBuilder.getInputs();
        items = qualifiedInput.items;
        user = { ...qualifiedInput.user, email: 'regular@test.com', name: 'Regular Customer' };
        break;
      }

      case 'express-shipping': {
        const expressBuilder = CartBuilder.new()
          .withItem({ name: 'Laptop Pro', price: 89900, quantity: 1 });
        const expressInput = expressBuilder.getInputs();
        items = expressInput.items;
        user = { ...expressInput.user, email: 'regular@test.com', name: 'Regular Customer' };
        shipping = ShippingMethod.EXPRESS;
        break;
      }

      case 'expedited-shipping': {
        const expeditedBuilder = CartBuilder.new()
          .withItem({ name: 'Smart Watch', price: 24900, quantity: 1 })
          .withTenure(3);
        const expeditedInput = expeditedBuilder.getInputs();
        items = expeditedInput.items;
        user = { ...expeditedInput.user, email: 'vip@test.com', name: 'VIP Customer' };
        shipping = ShippingMethod.EXPEDITED;
        break;
      }

      case 'multi-discounts': {
        const multiBuilder = CartBuilder.new()
          .withItem({ name: 'Wireless Earbuds', price: 8900, quantity: 5 })
          .withItem({ name: 'Coffee Maker', price: 8900, quantity: 3 })
          .withTenure(5);
        const multiInput = multiBuilder.getInputs();
        items = multiInput.items;
        user = { ...multiInput.user, email: 'vip@test.com', name: 'VIP Customer' };
        break;
      }

      case 'discount-cap-warning': {
        const capWarnBuilder = CartBuilder.new()
          .withItem({ name: 'Expensive Item', price: 50000, quantity: 20 })
          .withTenure(10);
        const capWarnInput = capWarnBuilder.getInputs();
        items = capWarnInput.items;
        user = { ...capWarnInput.user, email: 'vip@test.com', name: 'VIP Customer' };
        break;
      }

      case 'light-cart': {
        const lightBuilder = CartBuilder.new()
          .withItem({ name: 'T-Shirt Basic', price: 2500, quantity: 1 });
        const lightInput = lightBuilder.getInputs();
        items = lightInput.items;
        user = { ...lightInput.user, email: 'new@test.com', name: 'New Customer' };
        break;
      }

      case 'standard':
      default: {
        const standardBuilder = CartBuilder.new()
          .withItem({ name: 'Wireless Earbuds', price: 8900, quantity: 2 })
          .withItem({ name: 'Basic T-Shirt', price: 2500, quantity: 1 });
        const standardInput = standardBuilder.getInputs();
        items = standardInput.items;
        user = { ...standardInput.user, email: 'regular@test.com', name: 'Regular Customer' };
      }
    }

    // Update auth client first to sync with AuthProvider
    // Ensure user has required name property
    authClient.debugSetUser({
      tenureYears: user.tenureYears,
      name: user.name || 'Debug User',
      email: user.email || 'debug@test.com',
    });

    // Override store for debug mode
    const now = Date.now();
    useCartStore.setState({
      items: items.map((item: CartItem) => ({ ...item, addedAt: now })),
      user,
      shippingMethod: shipping,
      pricingResult: null
    });

    setTimeout(() => setIsReady(true), 0);
  }, [scenario]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing debug scenario: <span className="font-mono font-bold">{scenario}</span>...</p>
        </div>
      </div>
    );
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
              <strong>Debug Mode:</strong> Scenario: {scenario}. Change URL parameters to try different checkout states.
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Available scenarios: standard, heavy-cart, free-shipping-threshold, free-shipping-qualified,
              express-shipping, expedited-shipping, multi-discounts, discount-cap-warning, light-cart
            </p>
          </div>
        </div>
      </div>
      <CheckoutPage />
    </div>
  );
}
