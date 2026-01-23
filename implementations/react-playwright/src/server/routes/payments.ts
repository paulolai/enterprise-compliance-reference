import { Hono } from 'hono';
import Stripe from 'stripe';
import { db, OrderStatus } from '../../../../shared/src/index-server';
import { orders, orderItems } from '../../../../shared/src/index-server';
import { eq } from 'drizzle-orm';
import type { CartItem } from '../../../../shared/src/types';

/**
 * Payments API Routes
 * Handles Stripe PaymentIntent creation and order confirmation
 */

// Valid HTTP status codes for responses
type StatusCode = 200 | 201 | 400 | 401 | 404 | 500 | 501;

// Cart item as received from client (may use priceInCents instead of canonical `price`)
type CartItemRequest = Omit<CartItem, 'price'> & { priceInCents: number };

const router = new Hono();

// Initialize Stripe - use test mode secret key from environment
// NOTE: Using specific API version for Clover integration compatibility.
// Verify this matches your Stripe account configuration.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
    })
  : null;

/**
 * POST /api/payments/create-intent
 * Creates a Stripe PaymentIntent for the given cart
 *
 * Request body:
 * {
 *   amount: number (cents),
 *   cartId: string,
 *   userId: string,
 *   cartItems: Array<{ sku: string, priceInCents: number, quantity: number, weightInKg: number }>
 * }
 *
 * Response:
 * {
 *   paymentIntentId: string,
 *   clientSecret: string,
 *   amount: number,
 *   currency: string
 * }
 */
router.post('/create-intent', async (c) => {
  // Check if Stripe is configured
  if (!stripe) {
    return c.json(
      { error: 'Stripe not configured. Set STRIPE_SECRET_KEY environment variable.' },
      501 as StatusCode
    );
  }

  try {
    const body = await c.req.json();
    const { amount, cartId, userId, cartItems } = body;

    // Validation
    if (typeof amount !== 'number' || amount <= 0) {
      return c.json({ error: 'Amount must be a positive number in cents' }, 400);
    }

    if (!cartId || typeof cartId !== 'string') {
      return c.json({ error: 'cartId is required' }, 400);
    }

    if (!userId || typeof userId !== 'string') {
      return c.json({ error: 'userId is required' }, 400);
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return c.json({ error: 'cartItems must be a non-empty array' }, 400);
    }

    // Create Stripe PaymentIntent with metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'aud',
      metadata: {
        cartId,
        userId,
        itemCount: String(cartItems.length),
      },
    });

    return c.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount,
      currency: 'aud',
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe error:', error.message);
      const statusCode: StatusCode = (error.statusCode || 500) as StatusCode;
      return c.json({ error: error.message }, statusCode);
    }

    console.error('PaymentIntent creation error:', error);
    return c.json({ error: 'Failed to create PaymentIntent' }, 500);
  }
});

/**
 * POST /api/payments/confirm
 * Confirms a successful payment and creates the order
 *
 * Request body:
 * {
 *   paymentIntentId: string,
 *   cartItems: Array<{ sku: string, priceInCents: number, quantity: number, weightInKg: number }>,
 *   shippingAddress: {
 *     street: string,
 *     city: string,
 *     state: string,
 *     zip: string,
 *     country: string
 *   }
 * }
 *
 * Response:
 * {
 *   orderId: string,
 *   status: string,
 *   total: number,
 *   paymentIntentId: string,
 *   createdAt: number
 * }
 */
router.post('/confirm', async (c) => {
  // Check if Stripe is configured
  if (!stripe) {
    return c.json(
      { error: 'Stripe not configured. Set STRIPE_SECRET_KEY environment variable.' },
      501 as StatusCode
    );
  }

  try {
    const body = await c.req.json();
    const { paymentIntentId, cartItems, shippingAddress } = body;

    // Validation
    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      return c.json({ error: 'paymentIntentId is required' }, 400);
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return c.json({ error: 'cartItems must be a non-empty array' }, 400);
    }

    if (!shippingAddress || typeof shippingAddress !== 'object') {
      return c.json({ error: 'shippingAddress is required' }, 400);
    }

    // Check if order already exists (idempotency)
    const existingOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.stripePaymentIntentId, paymentIntentId));

    if (existingOrders.length > 0) {
      // Return existing order idempotently
      const order = existingOrders[0];
      return c.json({
        orderId: order.id,
        status: order.status,
        total: order.total,
        paymentIntentId: order.stripePaymentIntentId,
        createdAt: order.createdAt,
      });
    }

    // Verify the PaymentIntent with Stripe
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        if (error.type === 'StripeInvalidRequestError') {
          return c.json({ error: 'PaymentIntent not found' }, 404);
        }
        const statusCode = (error.statusCode || 500);
        return c.json({ error: error.message }, statusCode as any);
      }
      return c.json({ error: 'Failed to verify PaymentIntent' }, 500);
    }

    // Check payment status
    if (paymentIntent.status !== 'succeeded') {
      return c.json(
        {
          error: `Payment not successful. Status: ${paymentIntent.status}`,
        },
        400
      );
    }

    // Extract userId from metadata
    const userId = paymentIntent.metadata?.userId || 'unknown';
    const total = paymentIntent.amount;

    // Create order record
    const { randomUUID } = await import('crypto');
    const orderId = `order_${randomUUID()}`;
    const now = Date.now();

    // Determine pricing for line items
    const pricingResult = {
      originalTotal: total,
      lineItems: cartItems.map((item: CartItemRequest) => ({
        sku: item.sku,
        bulkDiscount: 0, // No discount calculation needed at this point
        quantity: item.quantity,
        priceInCents: item.priceInCents,
      })),
    };

    const newOrder = {
      id: orderId,
      userId,
      status: OrderStatus.PAID,
      total,
      pricingResult: JSON.stringify(pricingResult),
      shippingAddress: JSON.stringify(shippingAddress),
      stripePaymentIntentId: paymentIntentId,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(orders).values(newOrder);

    // Create order item records
    for (const item of cartItems) {
      const orderItemId = `order_item_${randomUUID()}`;
      const newOrderItem = {
        id: orderItemId,
        orderId,
        sku: item.sku,
        quantity: item.quantity,
        price: item.priceInCents,
        weightInKg: Math.round(item.weightInKg * 100), // Store as int * 100
        discount: 0, // No discount applied
        createdAt: now,
      };

      await db.insert(orderItems).values(newOrderItem);
    }

    return c.json({
      orderId,
      status: OrderStatus.PAID,
      total,
      paymentIntentId,
      createdAt: now,
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe error:', error.message);
      const statusCode: StatusCode = (error.statusCode || 500) as StatusCode;
      return c.json({ error: error.message }, statusCode);
    }

    console.error('Payment confirmation error:', error);
    return c.json({ error: 'Failed to confirm payment' }, 500);
  }
});

/**
 * POST /api/payments/cancel
 * Cancels a Stripe PaymentIntent
 *
 * Request body:
 * {
 *   paymentIntentId: string,
 *   reason?: string
 * }
 *
 * Response:
 * {
 *   paymentIntentId: string,
 *   status: string
 * }
 */
router.post('/cancel', async (c) => {
  // Check if Stripe is configured
  if (!stripe) {
    return c.json(
      { error: 'Stripe not configured. Set STRIPE_SECRET_KEY environment variable.' },
      501 as StatusCode
    );
  }

  try {
    const body = await c.req.json();
    const { paymentIntentId, reason } = body;

    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      return c.json({ error: 'paymentIntentId is required' }, 400);
    }

    // Cancel the PaymentIntent
    const cancelledIntent = await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: reason || 'requested_by_customer',
    });

    return c.json({
      paymentIntentId: cancelledIntent.id,
      status: cancelledIntent.status,
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe error:', error.message);
      const statusCode: StatusCode = (error.statusCode || 500) as StatusCode;
      return c.json({ error: error.message }, statusCode);
    }

    console.error('Payment cancellation error:', error);
    return c.json({ error: 'Failed to cancel payment' }, 500);
  }
});

/**
 * GET /api/payments/intent/:id
 * Retrieves a PaymentIntent status from Stripe
 *
 * Response:
 * {
 *   paymentIntentId: string,
 *   status: string,
 *   amount: number,
 *   currency: string,
 *   createdAt: number
 * }
 */
router.get('/intent/:id', async (c) => {
  // Check if Stripe is configured
  if (!stripe) {
    return c.json(
      { error: 'Stripe not configured. Set STRIPE_SECRET_KEY environment variable.' },
      501 as StatusCode
    );
  }

  try {
    const paymentIntentId = c.req.param('id');

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return c.json({
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      createdAt: paymentIntent.created * 1000, // Convert to milliseconds
      metadata: paymentIntent.metadata,
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe error:', error.message);
      const statusCode: StatusCode = (error.statusCode || 500) as StatusCode;
      return c.json({ error: error.message }, statusCode);
    }

    console.error('PaymentIntent retrieval error:', error);
    return c.json({ error: 'Failed to retrieve PaymentIntent' }, 500);
  }
});

export { router as paymentsRouter };
