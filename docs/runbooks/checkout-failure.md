# Checkout Failure Troubleshooting Runbook

## Summary
This runbook provides step-by-step guidance for diagnosing and resolving checkout flow failures in the Executable Specifications Demo application.

## Quick Diagnosis
Check the `/metrics` endpoint first:
```bash
curl http://localhost:5173/metrics
```

Key metrics to monitor:
- `checkouts_started_total` vs `checkouts_completed_total` - Look for gaps
- `checkout_value_cents` - Look for zero values or outliers
- `request_duration_ms{action="checkout"}` - Look for timeout spikes

---

## Common Failure Modes

### 1. Payment Intent Creation Failed

**Symptoms:**
- User fills checkout form, payment page never loads
- `/api/payments/create-intent` returns 4xx or 5xx
- Metrics show `http_requests_total{path="/api/payments/create-intent",status="4xx"}` increasing

**Diagnosis:**
```bash
# Check API endpoint
curl -X POST http://localhost:5173/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000, "currency": "aud"}'

# Check logs for Stripe errors
tail -f logs/app.log | grep -i stripe
```

**Resolution:**
1. Verify Stripe API keys are correctly set in environment:
   ```bash
   echo $STRIPE_SECRET_KEY
   ```
2. Check Stripe dashboard for API rate limits: https://dashboard.stripe.com/test/rate-limits
3. Restart the server process
4. If using mocked Stripe, verify `src/server/services/stripe-mock.ts` is being used

---

### 2. Cart State Mismatch

**Symptoms:**
- User added items to cart, but checkout shows different prices
- Order creation fails with 400 "Invalid SKU(s)" error
- Cart totals don't match pricing calculation result

**Diagnosis:**
```bash
# Get cart state
curl http://localhost:5173/api/cart

# Compare with pricing calculation
curl -X POST http://localhost:5173/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{"items": [...], "userId": "test", "isVip": false}'

# Check for SKU mismatch in database
curl http://localhost:5173/api/products
```

**Resolution:**
1. Clear user's cart in localStorage: `localStorage.removeItem('cartState')`
2. Verify all SKUs in the cart exist in the products database
3. Check `src/domain/cart/fns.ts` for calculation invariants
4. Run the property-based tests for cart invariants:
   ```bash
   cd packages/client
   pnpm test cart-invariants.test.ts
   ```

---

### 3. Database Connection Issues

**Symptoms:**
- Order creation fails with 500 error
- `/health` endpoint reports database issues
- Metrics show `db_connections` at 0 or max value

**Diagnosis:**
```bash
# Check database health
curl http://localhost:5173/readyz

# Check database file exists
ls -la data/*.db

# Check database file permissions
stat data/checkout.db
```

**Resolution:**
1. Restart the database service:
   ```bash
   docker-compose restart db
   ```
2. If using SQLite, check file isn't corrupted:
   ```bash
   sqlite3 data/checkout.db "PRAGMA integrity_check;"
   ```
3. Verify database connection string in environment variables
4. Check if SQLite file is writable by the application user

---

### 4. Network Timeout Issues

**Symptoms:**
- Checkout hangs at "Processing payment..."
- Request duration metrics spike (>30s)
- Cloudflare/nginx logs show timeouts

**Diagnosis:**
```bash
# Check request duration metrics
curl http://localhost:5173/metrics | grep request_duration_ms

# Test connectivity to external services
curl -I https://api.stripe.com/v1

# Check rate limiting headers
curl -I http://localhost:5173/api/pricing/calculate
```

**Resolution:**
1. Rate limiting may have been triggered. See `docs/runbooks/rate-limiting.md`
2. Check if Stripe API is experiencing outages: https://status.stripe.com/
3. Increase timeout values in `src/server/routes/payments.ts`
4. Consider implementing request timeout circuit breaker

---

### 5. Discount Calculation Errors

**Symptoms:**
- Expected discount not applied
- VIP badge shows but 5% discount not calculated
- Bulk discount badge shows but price doesn't change

**Diagnosis:**
```bash
# Test discount calculation
curl -X POST http://localhost:5173/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"sku": "T-SHIRT-BASIC", "quantity": 10, "weightInKg": 1}
    ],
    "isVip": true
  }'
```

**Resolution:**
1. Review `docs/pricing-strategy.md` for current business rules
2. Check `src/calculator/pricing.ts` for calculation logic
3. Verify product catalog has correct bulk discount thresholds
4. Test with property-based tests:
   ```bash
   pnpm test pricing.api.spec.ts
   ```

---

## Debug Mode

To enable detailed debug logging:

```bash
# Set environment variable
export DEBUG=checkout:*

# Or modify src/lib/logger.ts to set level: 'debug'
```

Debug endpoints available:
- `/api/debug/session` - View current session state
- `/api/debug/cart` - View cart state (bypasses authentication)
- `/api/debug/pricing` - Test pricing with arbitrary inputs

---

## Escalation Criteria

Escalate to the engineering team if:
- More than 10% of checkouts are failing (>1 hour duration)
- Payment processing is down for >15 minutes
- Database corruption detected
- Stripe API changes break integration
- Rate limiting errors affect legitimate users

---

## Recovery Procedures

### Full Application Restart

```bash
# Stop all processes
pkill -f "vite|hono"

# Remove stale state
rm -rf data/*.db-wal data/*.db-shm

# Restart
pnpm start
```

### Database Restore from Backup

```bash
# Stop application
pkill -f vite

# Restore from backup
cp backups/checkout.db.YYYYMMDD data/checkout.db

# Verify integrity
sqlite3 data/checkout.db "PRAGMA integrity_check;"

# Restart application
pnpm start
```

---

## Related Documentation
- [Pricing Strategy](/pricing-strategy.md)
- [Testing Framework](/TESTING_FRAMEWORK.md)
- [Stripe Webhook Handler](/runbooks/stripe-webhook.md)
- [Database Recovery](/runbooks/database-recovery.md)
