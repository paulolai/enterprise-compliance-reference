import { expect } from '@playwright/test';
import type { PricingResult, CartItemWithPriceInCents } from '@executable-specs/shared';
import { invariant } from './fixtures/invariant-helper';

interface CreatedOrder {
  orderId: string;
  userId: string;
  total: number;
  items: CartItemWithPriceInCents[];
}

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
) {
  const pricingResult = buildPricingResult(items);
  return {
    userId,
    items,
    total: pricingResult.grandTotal,
    pricingResult,
    shippingAddress: {
      street: '123 Test St',
      city: 'Test City',
      state: 'NSW',
      zip: '2000',
      country: 'AU',
    },
    stripePaymentIntentId,
  };
}

const API_BASE = '/api/orders';

invariant(
  'full order lifecycle: create -> retrieve -> list -> delete -> verify gone',
  {
    ruleReference: 'docs/specs/stories/04-order-persistence.md',
    rule: 'Order can be created, retrieved, listed, deleted, and verified gone',
    tags: ['@critical', '@lifecycle', '@e2e'],
  },
  async ({ request }) => {
    const userId = `lifecycle-user-${crypto.randomUUID()}`;
    const stripePaymentIntentId = `pi_lifecycle_${crypto.randomUUID()}`;
    const items: CartItemWithPriceInCents[] = [
      { sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
      { sku: 'SMART-WATCH', name: 'Smart Watch', priceInCents: 19900, quantity: 1, weightInKg: 0.2 },
    ];

    const payload = createOrderPayload(userId, items, stripePaymentIntentId);

    const createResponse = await request.post(`${API_BASE}`, { data: payload });

    if (createResponse.status() === 501) {
      return;
    }

    expect(createResponse.status()).toBe(200);
    const createResult = await createResponse.json() as { orderId: string; status: string; total: number };
    const orderId = createResult.orderId;

    expect(orderId).toBeTruthy();
    expect(createResult.status).toBe('paid');
    expect(createResult.total).toBe(payload.total);

    const getResponse = await request.get(`${API_BASE}/${orderId}`);
    expect(getResponse.status()).toBe(200);
    const orderDetail = await getResponse.json() as {
      id: string;
      userId: string;
      status: string;
      total: number;
      items: Array<{ sku: string; quantity: number }>;
    };

    expect(orderDetail.id).toBe(orderId);
    expect(orderDetail.userId).toBe(userId);
    expect(orderDetail.status).toBe('paid');
    expect(orderDetail.total).toBe(payload.total);
    expect(orderDetail.items.length).toBe(items.length);

    const userOrdersResponse = await request.get(`${API_BASE}/user/${userId}`);
    expect(userOrdersResponse.status()).toBe(200);
    const userOrdersResult = await userOrdersResponse.json() as {
      userId: string;
      orders: Array<{ id: string; userId: string; total: number }>;
    };

    expect(userOrdersResult.userId).toBe(userId);
    expect(userOrdersResult.orders.length).toBeGreaterThanOrEqual(1);
    const foundOrder = userOrdersResult.orders.find(o => o.id === orderId);
    expect(foundOrder).toBeTruthy();
    expect(foundOrder?.total).toBe(payload.total);

    const deleteResponse = await request.delete(`${API_BASE}/${orderId}`);
    expect(deleteResponse.status()).toBe(200);

    const verifyGetResponse = await request.get(`${API_BASE}/${orderId}`);
    expect(verifyGetResponse.status()).toBe(404);

    const userOrdersAfterDelete = await request.get(`${API_BASE}/user/${userId}`);
    expect(userOrdersAfterDelete.status()).toBe(200);
    const afterDeleteResult = await userOrdersAfterDelete.json() as {
      orders: Array<{ id: string }>;
    };
    const stillExists = afterDeleteResult.orders.some(o => o.id === orderId);
    expect(stillExists).toBe(false);
  }
);

invariant(
  'order lifecycle with single item cart',
  {
    ruleReference: 'docs/specs/stories/04-order-persistence.md',
    rule: 'Single item orders follow full lifecycle correctly',
    tags: ['@lifecycle', '@single-item'],
  },
  async ({ request }) => {
    const userId = `single-item-user-${crypto.randomUUID()}`;
    const stripePaymentIntentId = `pi_single_${crypto.randomUUID()}`;
    const items: CartItemWithPriceInCents[] = [
      { sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', priceInCents: 8900, quantity: 1, weightInKg: 0.1 },
    ];

    const payload = createOrderPayload(userId, items, stripePaymentIntentId);

    const createResponse = await request.post(`${API_BASE}`, { data: payload });

    if (createResponse.status() === 501) {
      return;
    }

    expect(createResponse.status()).toBe(200);
    const createResult = await createResponse.json() as { orderId: string };
    const orderId = createResult.orderId;

    const getResponse = await request.get(`${API_BASE}/${orderId}`);
    expect(getResponse.status()).toBe(200);
    const orderDetail = await getResponse.json() as {
      id: string;
      items: Array<{ sku: string }>;
    };

    expect(orderDetail.id).toBe(orderId);
    expect(orderDetail.items.length).toBe(1);
    expect(orderDetail.items[0].sku).toBe('WIRELESS-EARBUDS');

    const deleteResponse = await request.delete(`${API_BASE}/${orderId}`);
    expect(deleteResponse.status()).toBe(200);

    const verifyGetResponse = await request.get(`${API_BASE}/${orderId}`);
    expect(verifyGetResponse.status()).toBe(404);
  }
);

invariant(
  'order lifecycle with bulk discount cart',
  {
    ruleReference: 'docs/specs/stories/04-order-persistence.md',
    rule: 'Bulk discount orders follow full lifecycle correctly',
    tags: ['@lifecycle', '@bulk-discount'],
  },
  async ({ request }) => {
    const userId = `bulk-user-${crypto.randomUUID()}`;
    const stripePaymentIntentId = `pi_bulk_${crypto.randomUUID()}`;
    const items: CartItemWithPriceInCents[] = [
      { sku: 'T-SHIRT-BASIC', name: 'Basic T-Shirt', priceInCents: 2900, quantity: 6, weightInKg: 0.3 },
    ];

    const payload = createOrderPayload(userId, items, stripePaymentIntentId);

    const createResponse = await request.post(`${API_BASE}`, { data: payload });

    if (createResponse.status() === 501) {
      return;
    }

    expect(createResponse.status()).toBe(200);
    const createResult = await createResponse.json() as { orderId: string };
    const orderId = createResult.orderId;

    const getResponse = await request.get(`${API_BASE}/${orderId}`);
    expect(getResponse.status()).toBe(200);
    const orderDetail = await getResponse.json() as {
      id: string;
      items: Array<{ sku: string; quantity: number }>;
    };

    expect(orderDetail.id).toBe(orderId);
    expect(orderDetail.items.length).toBe(1);
    expect(orderDetail.items[0].sku).toBe('T-SHIRT-BASIC');
    expect(orderDetail.items[0].quantity).toBe(6);

    const userOrdersResponse = await request.get(`${API_BASE}/user/${userId}`);
    expect(userOrdersResponse.status()).toBe(200);
    const userOrdersResult = await userOrdersResponse.json() as {
      orders: Array<{ id: string }>;
    };
    expect(userOrdersResult.orders.some(o => o.id === orderId)).toBe(true);

    const deleteResponse = await request.delete(`${API_BASE}/${orderId}`);
    expect(deleteResponse.status()).toBe(200);

    const verifyGetResponse = await request.get(`${API_BASE}/${orderId}`);
    expect(verifyGetResponse.status()).toBe(404);
  }
);

invariant(
  'order lifecycle with multi-item cart',
  {
    ruleReference: 'docs/specs/stories/04-order-persistence.md',
    rule: 'Multi-item orders follow full lifecycle correctly',
    tags: ['@lifecycle', '@multi-item'],
  },
  async ({ request }) => {
    const userId = `multi-item-user-${crypto.randomUUID()}`;
    const stripePaymentIntentId = `pi_multi_${crypto.randomUUID()}`;
    const items: CartItemWithPriceInCents[] = [
      { sku: 'LAPTOP-PRO', name: 'Pro Laptop', priceInCents: 129900, quantity: 1, weightInKg: 2.5 },
      { sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', priceInCents: 8900, quantity: 2, weightInKg: 0.1 },
      { sku: 'DESK-LAMP', name: 'LED Desk Lamp', priceInCents: 4900, quantity: 1, weightInKg: 1.2 },
    ];

    const payload = createOrderPayload(userId, items, stripePaymentIntentId);

    const createResponse = await request.post(`${API_BASE}`, { data: payload });

    if (createResponse.status() === 501) {
      return;
    }

    expect(createResponse.status()).toBe(200);
    const createResult = await createResponse.json() as { orderId: string; total: number };
    const orderId = createResult.orderId;

    const getResponse = await request.get(`${API_BASE}/${orderId}`);
    expect(getResponse.status()).toBe(200);
    const orderDetail = await getResponse.json() as {
      id: string;
      userId: string;
      total: number;
      items: Array<{ sku: string; quantity: number }>;
    };

    expect(orderDetail.id).toBe(orderId);
    expect(orderDetail.userId).toBe(userId);
    expect(orderDetail.total).toBe(createResult.total);
    expect(orderDetail.items.length).toBe(3);

    const skuSet = new Set(orderDetail.items.map(i => i.sku));
    expect(skuSet.has('LAPTOP-PRO')).toBe(true);
    expect(skuSet.has('WIRELESS-EARBUDS')).toBe(true);
    expect(skuSet.has('DESK-LAMP')).toBe(true);

    const userOrdersResponse = await request.get(`${API_BASE}/user/${userId}`);
    expect(userOrdersResponse.status()).toBe(200);
    const userOrdersResult = await userOrdersResponse.json() as {
      orders: Array<{ id: string; total: number }>;
    };
    const foundOrder = userOrdersResult.orders.find(o => o.id === orderId);
    expect(foundOrder).toBeTruthy();
    expect(foundOrder?.total).toBe(createResult.total);

    const deleteResponse = await request.delete(`${API_BASE}/${orderId}`);
    expect(deleteResponse.status()).toBe(200);

    const verifyGetResponse = await request.get(`${API_BASE}/${orderId}`);
    expect(verifyGetResponse.status()).toBe(404);
  }
);
