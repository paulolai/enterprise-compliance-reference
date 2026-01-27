# Stripe Webhook Handling Runbook

## Summary
This runbook covers troubleshooting and management of Stripe webhook events for payment processing in the Executable Specifications Demo application.

## Architecture Overview

The application uses Stripe webhooks to receive real-time payment notifications:

1. **Development Mode:** Webhooks are mocked using `src/server/services/stripe-mock.ts`
2. **Production Mode:** Real Stripe webhooks hit `/api/payments/webhook`

## Webhook Events Handling

| Event Type | Handler | Purpose |
|-----------|---------|---------|
| `payment_intent.succeeded` | `handlePaymentSucceeded` | Orders paid, shipping confirmed |
| `payment_intent.payment_failed` | `handlePaymentFailed` | Notify user, allow retry |
| `payment_intent.canceled` | `handlePaymentCanceled` | Cleanup abandoned carts |
| `charge.refunded` | `handleRefund` | Process refunds, update order status |

---

## Setup and Configuration

### 1. Development Setup

Webhooks are mocked for local development. No configuration needed.

### 2. Production Setup

```bash
# Get the webhook signing secret from Stripe Dashboard
# Dashboard > Developers > Webhooks > Click webhook > Signing Secret

# Set environment variable
export STRIPE_WEBHOOK_SECRET=whsec_...

# Verify webhook is active
curl https://api.stripe.com/v1/webhook_endpoints \
  -u sk_test_...: | jq '.data[] | select(.url | contains("your-domain"))'
```

### 3. Configure Webhook Endpoint

Create webhook endpoint in Stripe Dashboard:
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Set URL: `https://your-domain.com/api/payments/webhook`
4. Select events to send:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
5. Copy the signing secret to your environment

---

## Troubleshooting

### Webhook Not Receiving Events

**Symptoms:**
- Payment succeeds in Stripe but order status doesn't update
- `/api/payments/webhook` endpoint never receives traffic
- Metrics show `http_requests_total{path="/api/payments/webhook",status="200"}` at 0

**Diagnosis:**
```bash
# Check if webhook is configured
curl https://api.stripe.com/v1/webhook_endpoints \
  -u sk_test_...: | jq '.data[0]'

# Test webhook from Stripe CLI
stripe trigger payment_intent.succeeded

# Check server logs for webhook arrivals
tail -f logs/app.log | grep webhook
```

**Resolution:**
1. Verify webhook endpoint URL is correct in Stripe Dashboard
2. Check webhook signing secret matches environment variable
3. Ensure `/api/payments/webhook` is accessible from internet
   ```bash
   curl -X POST https://your-domain.com/api/payments/webhook \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
4. Verify rate limiting allows webhook requests
5. Check if firewall rules block Stripe webhook IPs

---

### Signature Verification Failed

**Symptoms:**
- Webhook handler returns 401
- Logs show "Signature verification failed"
- Stripe Dashboard shows webhook delivery failures

**Diagnosis:**
```bash
# Check environment variable
echo $STRIPE_WEBHOOK_SECRET

# Test webhook with stripe CLI (includes signature)
stripe trigger payment_intent.succeeded --test-clock
```

**Resolution:**
1. Verify `STRIPE_WEBHOOK_SECRET` is set correctly in environment
2. Restart application after setting environment variable
3. Check for timezone issues - Stripe uses UTC timestamps
4. Verify clocks are synchronized on application server:
   ```bash
   ntpdate -q pool.ntp.org
   ```

---

### Duplicate Webhook Events

**Symptoms:**
- Duplicate orders created for single payment
- Inventory decremented multiple times
- User receives duplicate confirmation emails

**Diagnosis:**
```bash
# Check for duplicate order IDs
sqlite3 data/checkout.db "SELECT stripe_payment_intent_id, COUNT(*) \
  FROM orders GROUP BY stripe_payment_intent_id HAVING COUNT(*) > 1;"

# Check webhook delivery history in Stripe Dashboard
```

**Resolution:**
1. Verify idempotency key handling in `src/server/routes/orders.ts`
2. Check `stripePaymentIntentId` uniqueness constraint in database
3. Ensure order creation checks for existing order before creating:
   ```sql
   SELECT * FROM orders WHERE stripe_payment_intent_id = ?;
   ```
4. Consider using Stripe idempotency keys: `stripe.idempotent_key`

---

### Processing Failure on Succeeded Payment

**Symptoms:**
- Payment succeeded in Stripe but order not created
- User received payment confirmation but no order email
- `payment_intent.succeeded` webhook returned 500

**Diagnosis:**
```bash
# Check webhook delivery logs in Stripe Dashboard
# Look for response body and status code

# Check application logs
tail -f logs/app.log | grep -A 10 "payment_intent.succeeded"

# Check database for orphaned payments
sqlite3 data/checkout.db \
  "SELECT * FROM orders WHERE stripe_payment_intent_id IN ( \
    SELECT id FROM stripe_payments WHERE status = 'succeeded' \
  );"
```

**Resolution:**
1. Check database connectivity and schema
2. Verify `seedProducts()` ran successfully before webhook
3. Ensure all required fields are present in webhook payload
4. Manually retry failed order creation using `/api/payments/debug/retry`
5. Implement dead letter queue for failed webhooks

---

## Testing Webhooks Locally

### Using Stripe CLI

```bash
# Install Stripe CLI
curl https://packages.stripe.dev/api/security/keys/public/stripe-cli-gain-access.sh | sh

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5173/api/payments/webhook

# Test specific events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

### Using Mock Implementation

Use the mock service in `src/server/services/stripe-mock.ts`:

```typescript
import { mockStripeWebhook } from '../services/stripe-mock';

// Trigger a mock webhook event
await mockStripeWebhook('payment_intent.succeeded', {
  payment_intent: 'pi_test_123',
  amount: 10000,
});
```

---

## Event Replay

If webhooks were missed or need reprocessing:

### From Stripe Dashboard

1. Go to a specific event (Dashboard > Developers > Events)
2. Click "Send test webhook"
3. Select your webhook endpoint
4. Click "Send test webhook"

### Using Stripe CLI

```bash
# Get event ID
stripe events list --limit 1

# Redeliver event
stripe events resend <event_id>
```

### Manual API Replay

```bash
# Get event data
curl https://api.stripe.com/v1/events/<event_id> \
  -u sk_test_...:

# Post to webhook handler
curl -X POST http://localhost:5173/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_...",
    "type": "payment_intent.succeeded",
    "data": { ... },
    "api_version": "2025-01-27"
  }'
```

---

## Monitoring

### Key Metrics

Monitor these metrics from `/metrics` endpoint:

```bash
# Webhook success rate
curl http://localhost:5173/metrics | grep 'http_requests_total{path="/api/payments/webhook"'

# Payment成功率
curl http://localhost:5173/metrics | grep 'checkouts_completed_total'

# Webhook processing time
curl http://localhost:5173/metrics | grep 'request_duration_ms{action="webhook"'
```

### Alerts

Set up alerts for:
- Webhook failure rate > 5% for 5 minutes
- Payment success rate < 95% for 10 minutes
- Webhook processing time > 10 seconds P95
- Duplicate payment_intent.succeeded events

---

## Security Considerations

1. **Always verify signatures** - Never process webhooks without signature verification
2. **Use HTTPS** - Webhook URLs must use HTTPS in production
3. **Timestamp validation** - Reject webhooks older than 15 minutes
4. **IP allowlisting** - Consider blocking non-Stripe IPs
   ```
   Whitelist: 54.187.174.169, 54.187.205.235, 54.187.216.72
   ```
5. **Rate limiting** - Apply generous limits to webhooks (100/sec)
6. **Idempotency** - Design handlers to be safely re-runnable

---

## Related Documentation
- [Checkout Failure Runbook](/runbooks/checkout-failure.md)
- [Pricing Strategy](/pricing-strategy.md)
- [Stripe API Docs](https://stripe.com/docs/api)
