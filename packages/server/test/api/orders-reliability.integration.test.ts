import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { registerAllureMetadata } from '../../../shared/fixtures/allure-helpers';
import type { PricingResult, CartItemWithPriceInCents } from '@executable-specs/shared';

interface CreatedOrder {
  orderId: string;
  status: string;
  total: number;
  userId: string;
  stripePaymentIntentId: string;
  items: CartItemWithPriceInCents[];
}

interface CartScenario {
  name: string;
  items: CartItemWithPriceInCents[];
  total: number;
  pricingResult: PricingResult;
}

function registerApiMetadata(
  metadata: {
    ruleReference: string;
    rule: string;
    tags: string[];
    name?: string;
  }
) {
  const finalMetadata = {
    ...metadata,
    parentSuite: 'API Verification',
    suite: 'Orders',
    feature: 'Order Reliability',
  };
  registerAllureMetadata(allure, finalMetadata);
}

const API_BASE = '/api/orders';

function buildPricingResult(items: CartItemWithPriceInCents[]): PricingResult {
  const originalTotal = items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);
  const weightTotal = items.reduce((sum, item) => sum + item.weightInKg * item.quantity, 0);
  const weightSurcharge = weightTotal > 5 ? 500 : 0;
  const baseShipping = 700;

  return {
    originalTotal,
    subtotalAfterBulk: originalTotal,
    isCapped: false,
    finalTotal: originalTotal,
    grandTotal: originalTotal + baseShipping + weightSurcharge,
    totalDiscount: 0,
    volumeDiscountTotal: 0,
    vipDiscount: 0,
    lineItems: [],
    shipment: {
      method: 'STANDARD',
      baseShipping,
      weightSurcharge,
      expeditedSurcharge: 0,
      totalShipping: baseShipping + weightSurcharge,
      isFreeShipping: false,
    },
  };
}

function createOrderPayload(
  userId: string,
  items: CartItemWithPriceInCents[],
  stripePaymentIntentId: string
): {
  userId: string;
  items: CartItemWithPriceInCents[];
  total: number;
  pricingResult: PricingResult;
  shippingAddress: { fullName: string; streetAddress: string; city: string; state: string; zipCode: string; country: string };
  stripePaymentIntentId: string;
} {
  const pricingResult = buildPricingResult(items);
  return {
    userId,
    items,
    total: pricingResult.grandTotal,
    pricingResult,
    shippingAddress: {
      fullName: 'Test User',
      streetAddress: `${Math.floor(Math.random() * 9999)} Test St`,
      city: 'Test City',
      state: 'NSW',
      zipCode: '2000',
      country: 'AU',
    },
    stripePaymentIntentId,
  };
}

test.describe('Consecutive Orders Reliability', () => {
  test('creates 5+ consecutive orders without state reset and verifies full retrieval chain', async ({ request }) => {
    registerApiMetadata({
      ruleReference: 'docs/specs/stories/04-order-persistence.md',
      rule: 'System handles multiple consecutive orders without data loss or corruption',
      tags: ['@reliability', '@critical'],
      name: 'Consecutive orders reliability',
    });

    const scenarios: CartScenario[] = [
      {
        name: 'Single item order',
        items: [
          { sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
        ],
        total: 0,
        pricingResult: {} as PricingResult,
      },
      {
        name: 'Two item order',
        items: [
          { sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
          { sku: 'SMART-WATCH', name: 'Smart Watch', priceInCents: 19900, quantity: 1, weightInKg: 0.2 },
        ],
        total: 0,
        pricingResult: {} as PricingResult,
      },
      {
        name: 'Bulk quantity order (5+ items)',
        items: [
          { sku: 'T-SHIRT-BASIC', name: 'T-Shirt Basic', priceInCents: 2500, quantity: 6, weightInKg: 0.3 },
        ],
        total: 0,
        pricingResult: {} as PricingResult,
      },
      {
        name: 'Multi-category bulk order',
        items: [
          { sku: 'HOODIE-ZIP', name: 'Hoodie Zip', priceInCents: 5500, quantity: 4, weightInKg: 0.8 },
          { sku: 'JEANS-SLIM', name: 'Jeans Slim', priceInCents: 6500, quantity: 3, weightInKg: 0.7 },
          { sku: 'THROW-BLANKET', name: 'Throw Blanket', priceInCents: 3500, quantity: 2, weightInKg: 1.0 },
        ],
        total: 0,
        pricingResult: {} as PricingResult,
      },
      {
        name: 'High-value electronics order',
        items: [
          { sku: 'LAPTOP-PRO', name: 'Laptop Pro', priceInCents: 149900, quantity: 1, weightInKg: 2.5 },
          { sku: 'TABLET-10', name: 'Tablet 10', priceInCents: 49900, quantity: 1, weightInKg: 0.6 },
        ],
        total: 0,
        pricingResult: {} as PricingResult,
      },
      {
        name: 'Small accessories order',
        items: [
          { sku: 'DESK-LAMP', name: 'Desk Lamp', priceInCents: 3200, quantity: 2, weightInKg: 1.2 },
          { sku: 'COFFEE-MAKER', name: 'Coffee Maker', priceInCents: 7900, quantity: 1, weightInKg: 2.0 },
        ],
        total: 0,
        pricingResult: {} as PricingResult,
      },
    ];

    const createdOrders: CreatedOrder[] = [];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      const userId = `reliability-user-${crypto.randomUUID()}`;
      const stripePaymentIntentId = `pi_reliability_${crypto.randomUUID()}`;

      const payload = createOrderPayload(userId, scenario.items, stripePaymentIntentId);

      const createResponse = await request.post(`${API_BASE}`, { data: payload });

      if (createResponse.status() === 501) {
        test.skip(true, 'Orders API not implemented yet');
        return;
      }

      expect(createResponse.status(), `Order ${i + 1} (${scenario.name}) creation failed`).toBe(200);

      const createResult = await createResponse.json() as { orderId: string; status: string; total: number };
      expect(createResult.orderId, `Order ${i + 1} should have orderId`).toBeTruthy();
      expect(createResult.status, `Order ${i + 1} should be paid`).toBe('paid');
      expect(createResult.total, `Order ${i + 1} total mismatch`).toBe(payload.total);

      createdOrders.push({
        orderId: createResult.orderId,
        status: createResult.status,
        total: createResult.total,
        userId,
        stripePaymentIntentId,
        items: scenario.items,
      });
    }

    for (const order of createdOrders) {
      const getResponse = await request.get(`${API_BASE}/${order.orderId}`);
      expect(getResponse.status(), `Retrieve order ${order.orderId} should succeed`).toBe(200);

      const orderDetail = await getResponse.json() as {
        id: string;
        userId: string;
        status: string;
        total: number;
        items: Array<{ sku: string; quantity: number }>;
      };

      expect(orderDetail.id, `Retrieved order ID should match`).toBe(order.orderId);
      expect(orderDetail.userId, `Retrieved order userId should match`).toBe(order.userId);
      expect(orderDetail.status, `Retrieved order status should be paid`).toBe('paid');
      expect(orderDetail.total, `Retrieved order total should match`).toBe(order.total);
      expect(orderDetail.items.length, `Retrieved order should have correct item count`).toBe(order.items.length);

      for (const expectedItem of order.items) {
        const matchingItem = orderDetail.items.find(item => item.sku === expectedItem.sku);
        expect(matchingItem, `Item ${expectedItem.sku} should exist in retrieved order`).toBeTruthy();
        expect(matchingItem?.quantity, `Item ${expectedItem.sku} quantity should match`).toBe(expectedItem.quantity);
      }
    }

    for (const order of createdOrders) {
      const userOrdersResponse = await request.get(`${API_BASE}/user/${order.userId}`);
      expect(userOrdersResponse.status(), `User orders retrieval for ${order.userId} should succeed`).toBe(200);

      const userOrdersResult = await userOrdersResponse.json() as {
        userId: string;
        orders: Array<{ id: string; userId: string }>;
      };

      expect(userOrdersResult.userId, `User orders response userId should match`).toBe(order.userId);
      expect(userOrdersResult.orders.length, `User should have exactly 1 order`).toBe(1);
      expect(userOrdersResult.orders[0].id, `User order ID should match created order`).toBe(order.orderId);
    }

    const allOrdersResponse = await request.get(`${API_BASE}`);
    expect(allOrdersResponse.status(), `List all orders should succeed`).toBe(200);

    const allOrdersResult = await allOrdersResponse.json() as {
      orders: Array<{ id: string }>;
    };

    const createdOrderIds = new Set(createdOrders.map(o => o.orderId));
    const returnedOrderIds = new Set(allOrdersResult.orders.map(o => o.id));

    for (const orderId of createdOrderIds) {
      expect(returnedOrderIds.has(orderId), `Created order ${orderId} should appear in all orders list`).toBe(true);
    }

    expect(allOrdersResult.orders.length, `Total order count should be at least ${createdOrders.length}`).toBeGreaterThanOrEqual(createdOrders.length);
  });
});
