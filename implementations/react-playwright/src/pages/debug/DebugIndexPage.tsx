import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { ShippingMethod, type User } from '../../../../shared/src';

interface Scenario {
  id: string;
  name: string;
  description: string;
  action: () => void;
}

export const DebugIndexPage = () => {
  const [feedback, setFeedback] = useState<string>('');
  const { setUser, addItem, setShippingMethod, clear } = useCartStore();

  // Define debug scenarios
  const scenarios: Scenario[] = [
    {
      id: 'empty-cart',
      name: 'Empty Cart',
      description: 'Clears all items from the cart',
      action: () => {
        clear();
        setFeedback('Cart cleared successfully!');
      },
    },
    {
      id: 'vip-user',
      name: 'VIP User',
      description: 'Creates a user with VIP status (4 years tenure)',
      action: () => {
        const vipUser: User = {
          email: 'vip@example.com',
          name: 'VIP Test User',
          tenureYears: 4,
        };
        setUser(vipUser);
        setFeedback('VIP user created!');
      },
    },
    {
      id: 'regular-user',
      name: 'Regular User',
      description: 'Creates a regular (non-VIP) user',
      action: () => {
        const regularUser: User = {
          email: 'regular@example.com',
          name: 'Regular Test User',
          tenureYears: 1,
        };
        setUser(regularUser);
        setFeedback('Regular user created!');
      },
    },
    {
      id: 'bulk-cart',
      name: 'Bulk Discount Cart',
      description: 'Adds 4 items to trigger bulk discount',
      action: () => {
        clear();
        addItem({
          sku: 'WIRELESS-EARBUDS',
          name: 'Wireless Earbuds',
          price: 8900,
          quantity: 4,
          weightInKg: 0.1,
        });
        setShippingMethod(ShippingMethod.STANDARD);
        setFeedback('Bulk cart created!');
      },
    },
    {
      id: 'standard-shipping',
      name: 'Standard Shipping',
      description: 'Sets shipping method to Standard ($10)',
      action: () => {
        setShippingMethod(ShippingMethod.STANDARD);
        setFeedback('Shipping set to Standard!');
      },
    },
    {
      id: 'express-shipping',
      name: 'Express Shipping',
      description: 'Sets shipping method to Express ($25)',
      action: () => {
        setShippingMethod(ShippingMethod.EXPRESS);
        setFeedback('Shipping set to Express!');
      },
    },
  ];

  const applyScenario = (scenario: Scenario) => {
    scenario.action();
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleReset = () => {
    clear();
    setUser(null);
    setFeedback('All state reset!');
    setTimeout(() => setFeedback(''), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Warning Banner */}
      <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm">
              <strong>Development Only:</strong> This page is for debugging and test automation purposes.
              It should not be accessible in production deployments.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Debug Index</h1>
          <p className="text-gray-600">
            Developer tools and test scenarios for quick state manipulation and debugging.
          </p>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-900 rounded-lg">
            {feedback}
          </div>
        )}

        {/* Reset Button */}
        <div className="mb-8">
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Reset All State
          </button>
        </div>

        {/* Scenarios Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              data-testid={`scenario-card-${scenario.id}`}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-gray-900 mb-2">{scenario.name}</h3>
              <p
                data-testid="scenario-description"
                className="text-sm text-gray-600 mb-4"
              >
                {scenario.description}
              </p>
              <button
                onClick={() => applyScenario(scenario)}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Scenario
              </button>
            </div>
          ))}
        </div>

        {/* Navigation Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Debug Pages</h2>
          <div className="flex gap-4">
            <Link
              to="/debug/cart-view"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cart Debug View
            </Link>
            <Link
              to="/debug/checkout"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Checkout Debug
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
