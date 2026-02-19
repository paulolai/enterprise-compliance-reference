import Stripe from 'stripe';

export class MockStripe {
  paymentIntents: {
    create: (params: Stripe.PaymentIntentCreateParams) => Promise<unknown>;
    retrieve: (id: string) => Promise<unknown>;
    cancel: (id: string, params?: Stripe.PaymentIntentCancelParams) => Promise<unknown>;
  };

  constructor() {
    this.paymentIntents = {
      create: async (params: Stripe.PaymentIntentCreateParams) => {
        // Validation logic similar to real Stripe can go here if needed
        if (params.amount <= 0) {
           // This usually is handled by validation middleware, but for completeness
           throw new Error('Invalid amount');
        }

        return {
          id: 'pi_' + Math.random().toString(36).substring(7),
          object: 'payment_intent',
          amount: params.amount,
          currency: params.currency,
          status: 'requires_payment_method',
          client_secret: 'pi_client_secret_mock',
          metadata: params.metadata || {},
          created: Math.floor(Date.now() / 1000),
        };
      },

      retrieve: async (id: string) => {
        if (id === 'pi_nonexistent') {
          // StripeError constructor is protected but we need it for mock
          const error = new Stripe.errors.StripeInvalidRequestError({
             message: 'No such payment_intent: ' + id,
             type: 'invalid_request_error'
          }) as Stripe.errors.StripeInvalidRequestError;
          throw error;
        }

        if (id === 'pi_card_declined') {
           // StripeError constructor is protected but we need it for mock
           const error = new Stripe.errors.StripeCardError({
              message: 'Your card was declined.',
              type: 'card_error',
              code: 'card_declined'
           }) as Stripe.errors.StripeCardError;
           throw error;
        }

        // Default success for other IDs unless specified
        let status = 'succeeded';
        if (id === 'pi_failed_123') {
            status = 'requires_payment_method';
        }

        return {
          id: id,
          object: 'payment_intent',
          amount: 8900, // Default for tests
          currency: 'aud',
          status: status,
          client_secret: 'pi_client_secret_mock',
          metadata: { userId: 'test-user-123' },
          created: Math.floor(Date.now() / 1000),
        };
      },

      cancel: async (id: string) => {
         return {
            id: id,
            object: 'payment_intent',
            status: 'canceled',
         };
      }
    };
  }
}
