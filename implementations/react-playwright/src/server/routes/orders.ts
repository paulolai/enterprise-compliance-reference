import { Hono } from 'hono';
import { logger } from '../../lib/logger';
import { randomUUID } from 'crypto';
import { db, OrderStatus } from '../../../../shared/src/index-server';
import { orders, orderItems } from '../../../../shared/src/index-server';
import { eq } from 'drizzle-orm';
import { validateBody, validateParams, validateQuery } from '../../lib/validation/middleware';
import { requestSchemas, paramSchemas, querySchemas } from '../../lib/validation/schemas';
import { mapCartToLineItems, validateOrderInvariants } from '../../domain/cart/fns.ts';
import { isFailure } from '../../../../shared/src/result.ts';

const router = new Hono();

/**
 * POST /api/orders
 * Create a new order from cart state
 */
router.post('/', validateBody(requestSchemas.createOrder), async (c) => {
  try {
    const { userId, items, total, pricingResult, shippingAddress, stripePaymentIntentId } = c.get('validatedBody');

    // Domain Invariant Check
    const invariantResult = validateOrderInvariants(total, items);
    if (isFailure(invariantResult)) {
      return c.json({ error: invariantResult.error }, 400);
    }

    // Check if order already exists for this payment intent (idempotency)
    const existingOrders = await db.select().from(orders).where(eq(orders.stripePaymentIntentId, stripePaymentIntentId));

    if (existingOrders.length > 0) {
      // Return existing order idempotently
      return c.json({
        orderId: existingOrders[0].id,
        status: existingOrders[0].status,
        total: existingOrders[0].total,
      });
    }

    // Create order record
    const orderId = `order_${randomUUID()}`;
    const now = Date.now();

    const newOrder = {
      id: orderId,
      userId,
      status: OrderStatus.PAID,
      total,
      pricingResult: JSON.stringify(pricingResult),
      shippingAddress: JSON.stringify(shippingAddress),
      stripePaymentIntentId,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(orders).values(newOrder);

    // Map cart items to line items using domain logic
    const lineItems = mapCartToLineItems(items, pricingResult);

    // Create order item records
    for (const item of lineItems) {
      const orderItemId = `order_item_${randomUUID()}`;

      const newOrderItem = {
        id: orderItemId,
        orderId,
        sku: item.sku,
        quantity: item.quantity,
        price: item.priceInCents,
        weightInKg: Math.round(item.weightInKg * 100), // Store as int * 100
        discount: item.bulkDiscount,
        createdAt: now,
      };

      await db.insert(orderItems).values(newOrderItem);
    }

    return c.json({
      orderId,
      status: 'paid',
      total,
    });
  } catch (error) {
    logger.error('Order creation failed', error, { action: 'create_order' });
    return c.json({ error: 'Failed to create order' }, 500);
  }
});

/**
 * GET /api/orders/:orderId
 * Get order by ID with items
 */
router.get('/:orderId', validateParams(paramSchemas.orderId), async (c) => {
  try {
    const { orderId } = c.get('validatedParams');

    const orderResults = await db.select().from(orders).where(eq(orders.id, orderId));

    if (orderResults.length === 0) {
      return c.json({ error: 'Order not found' }, 404);
    }

    const order = orderResults[0];

    // Get order items
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    // Safely parse JSON fields
    try {
      return c.json({
        id: order.id,
        userId: order.userId,
        status: order.status,
        total: order.total,
        pricingResult: JSON.parse(order.pricingResult),
        shippingAddress: JSON.parse(order.shippingAddress),
        stripePaymentIntentId: order.stripePaymentIntentId,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: items.map((item) => ({
          id: item.id,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          weightInKg: item.weightInKg / 100, // Convert back
          discount: item.discount,
          createdAt: item.createdAt,
        })),
      });
    } catch (parseError) {
      logger.error('Order data parse failed', parseError, { action: 'parse_order' });
      return c.json({ error: 'Invalid order data format' }, 400);
    }
  } catch (error) {
    logger.error('Order retrieval failed', error, { action: 'get_order' });
    return c.json({ error: 'Failed to retrieve order' }, 500);
  }
});

/**
 * GET /api/orders
 * List orders with optional filtering
 */
router.get('/', validateQuery(querySchemas.listOrders), async (c) => {
  try {
    const { userId } = c.get('validatedQuery');

    const query = db.select().from(orders).$dynamic();
    if (userId) {
      query.where(eq(orders.userId, userId));
    }

    const userOrders = await query;

    return c.json({
      orders: userOrders.map((order) => ({
        id: order.id,
        userId: order.userId,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
    });
  } catch (error) {
    logger.error('Orders retrieval failed', error, { action: 'list_orders' });
    return c.json({ error: 'Failed to retrieve orders' }, 500);
  }
});

/**
 * DELETE /api/orders/:orderId
 * Delete order and cascade delete order items
 */
router.delete('/:orderId', validateParams(paramSchemas.orderId), async (c) => {
  try {
    const { orderId } = c.get('validatedParams');

    const orderResults = await db.select().from(orders).where(eq(orders.id, orderId));

    if (orderResults.length === 0) {
      return c.json({ error: 'Order not found' }, 404);
    }

    // Cascade delete is handled by the foreign key constraint
    await db.delete(orders).where(eq(orders.id, orderId));

    return c.json({ success: true });
  } catch (error) {
    logger.error('Order deletion failed', error, { action: 'delete_order' });
    return c.json({ error: 'Failed to delete order' }, 500);
  }
});

export { router as ordersRouter };