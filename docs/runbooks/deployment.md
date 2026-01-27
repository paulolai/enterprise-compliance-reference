# Deployment Runbook

## Summary
This runbook covers end-to-end deployment procedures for the Executable Specifications Demo application, including pre-deployment checks, deployment steps, and post-deployment verification.

---

## Deployment Overview

The application uses the following architecture:

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (SSL/443)  │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
         ┌────▼────┐              ┌────▼────┐
         │  App    │              │  App    │
         │ (Hono)  │              │ (Hono)  │
         └────┬────┘              └────┬────┘
              │                         │
         ┌────▼─────────────────────┬───▼────┐
         │      SQLite Database     │        │
         │    (or RDS/Cloud SQL)    │        │
         └──────────────────────────┘        │
              │                         │
         ┌────▼────┐              ┌────▼────┐
         │  Redis  │              │  Stripe │
         │ (Cache) │              │  API    │
         └─────────┘              └─────────┘
```

---

## Pre-Deployment Checklist

### 1. Code Quality Gate

```bash
# Run TypeScript build
pnpm exec tsc -b
# Expected: 0 errors

# Run all tests
pnpm test
# Expected: All tests passing

# Run linter
pnpm lint
# Expected: No lint errors

# Check bundle size
pnpm build
du -sh dist/
# Expected: <10MB for production build
```

### 2. Environment Verification

```bash
# Check required environment variables
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL: $DATABASE_URL"
echo "STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:0:10}..."
echo "STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:+SET}"
echo "STRICT_AUTH: $STRICT_AUTH"

# Verify Stripe API connectivity
curl -I https://api.stripe.com/v1
# Expected: 200 OK
```

### 3. Database Migration Status

```bash
# Check current schema version
sqlite3 data/checkout.db "PRAGMA user_version;"

# Verify database integrity
sqlite3 data/checkout.db "PRAGMA integrity_check;"
# Expected: ok

# Verify products are seeded
sqlite3 data/checkout.db "SELECT COUNT(*) FROM products;"
# Expected: >= 11 (product catalog)
```

### 4. Infrastructure Readiness

```bash
# Check disk space (>2GB free)
df -h /var/lib/checkout

# Check memory (>1GB free)
free -h

# Check database backup exists
ls -lh backups/checkout.db.* | tail -1

# Verify SSL certificate validity
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Deployment Procedures

### Option 1: Docker Deployment (Recommended)

#### A. Build Image

```bash
# Build production image
docker build -t checkout-app:latest .

# Tag for registry
docker tag checkout-app:latest registry.your-domain.com/checkout-app:latest

# Push to registry
docker push registry.your-domain.com/checkout-app:latest
```

#### B. Update docker-compose.prod.yml

```yaml
version: '3.8'

services:
  app:
    image: registry.your-domain.com/checkout-app:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: /app/data/checkout.db
      STRIPE_SECRET_KEY: sk_live_...
      STRIPE_WEBHOOK_SECRET: whsec_...
      STRICT_AUTH: "true"
    volumes:
      - ./data:/app/data
      - ./backups:/app/backups
    ports:
      - "3001:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    resources:
      limits:
        cpus: '1'
        memory: 1G
      reservations:
        cpus: '0.5'
        memory: 512M
```

#### C. Deploy

```bash
# Pull latest image
docker-compose -f docker-compose.prod.yml pull

# Start new containers
docker-compose -f docker-compose.prod.yml up -d

# Watch logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### D. Rollback

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Rollback to previous tag
docker tag checkout-app:previous registry.your-domain.com/checkout-app:latest

# Restart
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Direct Server Deployment

#### A. Deploy Code

```bash
# SSH into server
ssh prod-server

# Navigate to app directory
cd /var/www/checkout

# Pull latest code
git pull origin main

# Verify commit
git log -1 --oneline

# Install dependencies
pnpm install --production=false
pnpm build

# Create pre-deployment backup
BACKUP_DIR="backups/pre-deploy-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp data/checkout.db "$BACKUP_DIR/"
```

#### B. Start/Restart Application

```bash
# Stop current process
pm2 stop checkout-app

# Start new process
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
```

or using systemd:

```bash
# Systemd restart
sudo systemctl restart checkout-app

# Check status
sudo systemctl status checkout-app
```

#### C. Smoke Test

```bash
# Health check
curl http://localhost:3000/health

# Ready check (database connection)
curl http://localhost:3000/readyz

# Liveness check
curl http://localhost:3000/livez

# API smoke test
curl -X POST http://localhost:3000/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{"items": [], "userId": "smoke-test", "isVip": false}'
```

---

## Post-Deployment Verification

### 1. Health Endpoint Verification

```bash
# Check all health endpoints
for endpoint in health readyz livez; do
  echo "Checking /$endpoint"
  curl -f http://localhost:3000/$endpoint || echo "FAILED"
done

# Check metrics endpoint
curl http://localhost:3000/metrics
```

### 2. Integration Verification

```bash
# Test pricing calculation (no database)
curl -X POST http://localhost:3000/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"sku": "WIRELESS-EARBUDS", "quantity": 1, "weightInKg": 0.1}
    ],
    "userId": "deploy-test",
    "isVip": false
  }'

# Wait for application to fully start
sleep 10

# Test order creation (requires database)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "deploy-test",
    "items": [
      {"sku": "WIRELESS-EARBUDS", "name": "Wireless Earbuds", "priceInCents": 8900, "quantity": 1, "weightInKg": 0.1}
    ],
    "total": 9600,
    "pricingResult": {
      "originalTotal": 8900,
      "subtotalAfterBulk": 8900,
      "isCapped": false,
      "finalTotal": 8900,
      "grandTotal": 9600,
      "totalDiscount": 0,
      "volumeDiscountTotal": 0,
      "vipDiscount": 0,
      "lineItems": [],
      "shipment": {
        "method": "STANDARD",
        "baseShipping": 700,
        "weightSurcharge": 0,
        "expeditedSurcharge": 0,
        "totalShipping": 700,
        "isFreeShipping": false
      }
    },
    "shippingAddress": {
      "street": "123 Deploy St",
      "city": "Deploy City",
      "state": "NSW",
      "zip": "2000",
      "country": "AU"
    },
    "stripePaymentIntentId": "pi_deploy_test"
  }'
```

### 3. Verify Business Rules

```bash
# Test bulk discount (>5 items of same SKU)
curl -X POST http://localhost:3000/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"sku": "T-SHIRT-BASIC", "quantity": 10, "weightInKg": 1}
    ],
    "userId": "deploy-bulk-test",
    "isVip": false
  }' | jq '.volumeDiscountTotal'
# Expected: >0

# Test VIP discount
curl -X POST http://localhost:3000/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"sku": "WIRELESS-EARBUDS", "quantity": 1, "weightInKg": 0.1}
    ],
    "userId": "deploy-vip-test",
    "isVip": true
  }' | jq '.vipDiscount'
# Expected: >0

# Test free shipping threshold (>$100)
curl -X POST http://localhost:3000/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"sku": "LAPTOP-PRO", "quantity": 1, "weightInKg": 2.5}
    ],
    "userId": "deploy-shipping-test",
    "isVip": false
  }' | jq '.shipment.isFreeShipping'
# Expected: true
```

### 4. Monitoring Setup

```bash
# Verify metrics endpoint is accessible
curl http://localhost:3000/metrics | head -20

# Set up Prometheus scraping (if using Prometheus)
# Add to prometheus.yml:
# scrape_configs:
#   - job_name: 'checkout-app'
#     metrics_path: '/metrics'
#     static_configs:
#       - targets: ['localhost:3000']

# Restart Prometheus to pick up new config
systemctl restart prometheus
```

---

## Blue-Green Deployment

For zero-downtime deployments:

```bash
# 1. Deploy to green environment
ssh green-server "cd /var/www/checkout && git pull && pnpm install -P && pnpm build && pm2 restart checkout-app"

# 2. Verify green is healthy
ssh green-server "curl -f http://localhost:3000/health"

# 3. Switch traffic via reverse proxy
# Update nginx upstream to point to green
sed -i 's/upstream_blue/upstream_green/' /etc/nginx/conf.d/checkout.conf
nginx -t && nginx -s reload

# 4. Verify blue is idle (no connections)
ssh blue-server "ss -tan | grep :3000"

# 5. Update blue (now idle)
ssh blue-server "cd /var/www/checkout && git pull && pnpm install -P && pnpm build && pm2 restart checkout-app"
```

---

## Canary Deployment

For gradual rollout:

```bash
# 1. Deploy to canary (5-10% of traffic)
ssh canary-server "cd /var/www/checkout && git pull && pnpm install -P && pnpm build && pm2 restart checkout-app"

# 2. Direct 5% traffic to canary
# Update nginx to split traffic:
#   upstream checkout {
#     least_conn;
#     server app1:3000;
#     server app2:3000;
#     server canary:3000 weight=5;  # 5% traffic
#   }

# 3. Monitor canary for 15-30 minutes
watch -n 5 'curl -s http://localhost:3000/metrics | grep http_requests_total'

# 4. If healthy, increase traffic gradually (5% -> 25% -> 50% -> 100%)

# 5. If issues detected, rollback immediately
# Set canary weight back to 0 and restart blue servers
```

---

## Rollback Procedures

### Immediate Rollback (If deployment is broken)

```bash
# 1. Stop current deployment
pm2 stop checkout-app

# 2. Restore from backup
cp backups/pre-deploy-YYYYMMDD_HHMMSS/checkout.db data/checkout.db

# 3. Rollback code
git checkout HEAD~1
pnpm install -P
pnpm build

# 4. Start application
pm2 start checkout-app

# 5. Verify
curl http://localhost:3000/health
```

### Database Rollback Only

If only database changes were problematic:

```bash
# Stop application
pm2 stop checkout-app

# Restore database from backup
BACKUP="backups/pre-deploy-$(date +%Y%m%d_%H%M%S).db"
cp "$BACKUP" data/checkout.db

# Restart application
pm2 restart checkout-app
```

### Revert Git Commit

```bash
# Safe revert (creates new commit reversing changes)
git revert HEAD

# Force reset (use with caution)
git reset --hard HEAD~1
git push --force

# Then redeploy as normal
```

---

## Disaster Recovery

### Full Environment Restore

```bash
# 1. Provision new server/Droplet
# (AWS EC2, DigitalOcean, etc.)

# 2. Install dependencies
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs sqlite3 nginx

# 3. Clone repository
git clone https://github.com/your-org/checkout-app.git
cd checkout-app

# 4. Restore data
scp backups/checkout.db.* prod-server:/var/www/checkout/data/

# 5. Set environment variables
cat > /var/www/checkout/.env << 'EOF'
NODE_ENV=production
DATABASE_URL=/var/www/checkout/data/checkout.db
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRICT_AUTH=true
EOF

# 6. Build and start
pnpm install -P
pnpm build
pm2 start ecosystem.config.js

# 7. Configure reverse proxy
cp production/nginx.conf /etc/nginx/conf.d/checkout.conf
nginx -t && nginx -s reload

# 8. Configure SSL (Let's Encrypt)
certbot --nginx -d your-domain.com
```

---

## Related Documentation
- [Checkout Failure Runbook](/runbooks/checkout-failure.md)
- [Database Recovery Runbook](/runbooks/database-recovery.md)
- [Stripe Webhook Runbook](/runbooks/stripe-webhook.md)
