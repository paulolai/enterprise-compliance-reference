import { Hono } from 'hono';
import type { StatusCode as HonoStatusCode } from 'hono/utils/http-status';
import { logger } from '../../lib/logger';
import Stripe from 'stripe';
import { MockStripe } from '../services/stripe-mock';
import { db, OrderStatus } from '@executable-specs/shared/index-server';
import { orders, orderItems } from '@executable-specs/shared/index-server';
import { eq } from 'drizzle-orm';
import { validateBody, validateParams } from '../../lib/validation/middleware';
import { requestSchemas, paramSchemas } from '../../lib/validation/schemas';
import { mapCartToLineItems, validateOrderInvariants } from '../../domain/cart/fns.ts';
import { isFailure } from '@executable-specs/shared/result';

/**
 * Payments API Routes
 * Handles Stripe PaymentIntent creation and order confirmation
 */

// Valid HTTP status codes for responses
type StatusCode = 200 | 201 | 400 | 401 | 404 | 500 | 501;

const router = new Hono();

// Initialize Stripe - use test mode secret key from environment or Mock
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const useMock = process.env.MOCK_STRIPE === 'true';

let stripe: Stripe | any = null;

if (useMock) {
  logger.info('Using Mock Stripe implementation', { component: 'PaymentsAPI' });
  stripe = new MockStripe();
} else if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
    });
}

/**
 * POST /api/payments/create-intent
 * Creates a Stripe PaymentIntent for the given cart
 */
router.post('/create-intent', validateBody(requestSchemas.createPaymentIntent), async (c) => {
  // Check if Stripe is configured
  if (!stripe) {
    return c.json(
      { error: 'Stripe not configured. Set STRIPE_SECRET_KEY environment variable.' },
      501 as StatusCode
    );
  }

  try {
    const { amount, cartId, userId, cartItems } = c.get('validatedBody');

    // Domain Invariant Check
    const invariantResult = validateOrderInvariants(amount, cartItems);
    if (isFailure(invariantResult)) {
      return c.json({ error: invariantResult.error }, 400);
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
      logger.error('StripeAPI error', error.message, { action: 'create_intent' });
      const statusCode: StatusCode = (error.statusCode || 500) as StatusCode;
      return c.json({ error: error.message }, statusCode);
    }

    logger.error('PaymentIntent creation failed', error, { action: 'create_intent' });
    return c.json({ error: 'Failed to create PaymentIntent' }, 500);
  }
});

/**
 * POST /api/payments/confirm
 * Confirms a successful payment and creates the order
 */
router.post('/confirm', validateBody(requestSchemas.confirmPayment), async (c) => {
  // Check if Stripe is configured
  if (!stripe) {
    return c.json(
      { error: 'Stripe not configured. Set STRIPE_SECRET_KEY environment variable.' },
      501 as StatusCode
    );
  }

  try {
    const { paymentIntentId, cartItems, shippingAddress } = c.get('validatedBody');

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
        return c.json({ error: error.message }, statusCode as HonoStatusCode);
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

    // Use domain function to map line items
    const pricingResult = {
      originalTotal: total,
      lineItems: mapCartToLineItems(cartItems),
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
      logger.error('StripeAPI error', error.message, { action: 'confirm_payment' });
      const statusCode: StatusCode = (error.statusCode || 500) as StatusCode;
      return c.json({ error: error.message }, statusCode);
    }

    logger.error('Payment confirmation failed', error, { action: 'confirm_payment' });
    return c.json({ error: 'Failed to confirm payment' }, 500);
  }
});

/**
 * POST /api/payments/cancel
 * Cancels a Stripe PaymentIntent
 */
router.post('/cancel', validateBody(requestSchemas.cancelPayment), async (c) => {
  // Check if Stripe is configured
  if (!stripe) {
    return c.json(
      { error: 'Stripe not configured. Set STRIPE_SECRET_KEY environment variable.' },
      501 as StatusCode
    );
  }

  try {
    const { paymentIntentId, reason } = c.get('validatedBody');

    // Cancel the PaymentIntent
    const cancelledIntent = await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: (reason as Stripe.PaymentIntentCancelParams.CancellationReason) || 'requested_by_customer',
    });

    return c.json({
      paymentIntentId: cancelledIntent.id,
      status: cancelledIntent.status,
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      logger.error('StripeAPI error', error.message, { action: 'cancel_payment' });
      const statusCode: StatusCode = (error.statusCode || 500) as StatusCode;
      return c.json({ error: error.message }, statusCode);
    }

    logger.error('Payment cancellation failed', error, { action: 'cancel_payment' });
    return c.json({ error: 'Failed to cancel payment' }, 500);
  }
});

/**
 * GET /api/payments/intent/:id
 * Retrieves a PaymentIntent status from Stripe
 */
router.get('/intent/:id', validateParams(paramSchemas.paymentIntentId), async (c) => {
  // Check if Stripe is configured
  if (!stripe) {
    return c.json(
      { error: 'Stripe not configured. Set STRIPE_SECRET_KEY environment variable.' },
      501 as StatusCode
    );
  }

  try {
    const { id: paymentIntentId } = c.get('validatedParams');

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
      logger.error('StripeAPI error', error.message, { action: 'get_intent' });
      const statusCode: StatusCode = (error.statusCode || 500) as StatusCode;
      return c.json({ error: error.message }, statusCode);
    }

    logger.error('PaymentIntent retrieval failed', error, { action: 'get_intent' });
    return c.json({ error: 'Failed to retrieve PaymentIntent' }, 500);
  }
});

export { router as paymentsRouter };
