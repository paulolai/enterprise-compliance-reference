import { Hono } from 'hono';
import { logger } from '../../lib/logger';
import { randomUUID } from 'crypto';
import { db, OrderStatus, products, seedProducts } from '@executable-specs/shared/index-server';
import { orders, orderItems } from '@executable-specs/shared/index-server';
import { eq, inArray } from 'drizzle-orm';
import { validateBody, validateParams } from '../../lib/validation/middleware';
import { requestSchemas, paramSchemas } from '../../lib/validation/schemas';
import type { CreateOrderRequest, GetOrderRequest } from '../../lib/validation/schemas';
import { mapCartToLineItems, validateOrderInvariants } from '../../domain/cart/fns.ts';
import { isFailure } from '@executable-specs/shared/result';

const router = new Hono();

/**
 * POST /api/orders
 * Create a new order from cart state
 */
router.post('/', validateBody(requestSchemas.createOrder), async (c) => {
  try {
    const { userId, items, total, pricingResult, shippingAddress, stripePaymentIntentId } = c.get('validatedBody') as CreateOrderRequest;


    // Ensure products are seeded (idempotent)
    await seedProducts();

    // Domain Invariant Check
    const invariantResult = validateOrderInvariants(total, items);
    if (isFailure(invariantResult)) {
      return c.json({ error: invariantResult.error }, 400);
    }

    // SKU Validation: Ensure all SKUs exist in the database
    const skus = items.map(item => item.sku);
    const existingProducts = await db.select({ sku: products.sku })
      .from(products)
      .where(inArray(products.sku, skus));
    
    const existingSkus = new Set(existingProducts.map(p => p.sku));
    const invalidSkus = skus.filter(sku => !existingSkus.has(sku));

    if (invalidSkus.length > 0) {
      return c.json({ 
        error: 'Invalid SKU(s) provided', 
        invalidSkus 
      }, 400);
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
    // Log with console.error for debugging - the logger has issues in dev mode
    console.error('[DEBUG] Order creation failed:', error);
    logger.error('Order creation failed', error, { action: 'create_order' });
    const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
    return c.json({ error: errorMessage }, 500);
  }
});

/**
 * GET /api/orders
 * List all orders
 */
router.get('/', async (c) => {
  try {
    const allOrders = await db.select().from(orders);

    return c.json({
      orders: allOrders.map((order) => ({
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
 * GET /api/orders/user/:userId
 * Get orders for a specific user
 * NOTE: This MUST come BEFORE /:orderId to avoid matching orders that start with "user"
 */
router.get('/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    const userOrders = await db.select().from(orders).where(eq(orders.userId, userId));

    return c.json({
      userId,
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
    logger.error('User orders retrieval failed', error, { action: 'get_user_orders' });
    return c.json({ error: 'Failed to retrieve user orders' }, 500);
  }
});

/**
 * GET /api/orders/:orderId
 * Get order by ID with items
 */
router.get('/:orderId', validateParams(paramSchemas.orderId), async (c) => {
  try {
    const { orderId } = c.get('validatedParams') as GetOrderRequest;

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
 * DELETE /api/orders/:orderId
 * Delete order and cascade delete order items
 */
router.delete('/:orderId', validateParams(paramSchemas.orderId), async (c) => {
  try {
    const { orderId } = c.get('validatedParams') as GetOrderRequest;

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
