# Database Recovery Runbook

## Summary
This runbook provides procedures for backing up, restoring, and recovering the SQLite database used by the Executable Specifications Demo application.

## Database Architecture

The application uses SQLite for data persistence:

- **Database File:** `data/checkout.db`
- **WAL Files:** `data/checkout.db-wal`, `data/checkout.db-shm` (Write-Ahead Logs)
- **Schema Location:** `implementations/executable-specs/shared/src/index-server.ts` (Drizzle ORM)

---

## Regular Backup Procedures

### Automated Backup

Setup cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM UTC
0 2 * * * /path/to/scripts/backup-db.sh
```

Backup script (`scripts/backup-db.sh`):
```bash
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="data/checkout.db"
BACKUP_DIR="backups"
BACKUP_FILE="${BACKUP_DIR}/checkout.db.${DATE}"

mkdir -p "$BACKUP_DIR"

# Create backup
cp "$DB_PATH" "$BACKUP_FILE"

# Compress old backups (>7 days)
find "$BACKUP_DIR" -name "checkout.db.*" -mtime +7 -exec gzip {} \;

# Remove old backups (>30 days)
find "$BACKUP_DIR" -name "checkout.db.*" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

### Manual Backup

```bash
# Create backup with timestamp
DATE=$(date +%Y%m%d_%H%M%S)
cp data/checkout.db "backups/checkout.db.${DATE}"

# Create backup with application state (including WAL)
DATE=$(date +%Y%m%d_%H%M%S)
sqlite3 data/checkout.db ".backup 'backups/checkout.db.${DATE}'"

# Verify backup integrity
sqlite3 "backups/checkout.db.${DATE}" "PRAGMA integrity_check;"
```

### Before Schema Changes

Always backup before schema migrations:

```bash
DATE=$(date +%Y%m%d_%H%M%S)
cp data/checkout.db "backups/checkout.db.pre-migration.${DATE}"
```

---

## Database Corruption Detection

### Symptoms

- Queries return empty results for known data
- Application crashes with "database is malformed" error
- SQLite integrity check fails

### Diagnose Corruption

```bash
# Run integrity check
sqlite3 data/checkout.db "PRAGMA integrity_check;"

# Check for corrupt pages
sqlite3 data/checkout.db "PRAGMA quick_check;"

# Analyze database
sqlite3 data/checkout.db "PRAGMA database_list;"
sqlite3 data/checkout.db ".tables"
sqlite3 data/checkout.db ".schema"
```

### Understanding Diagnostic Output

- `ok` - Database is healthy
- `database disk image is malformed` - Critical corruption
- `database is malformed` - Moderate corruption
- `recoverable errors found` - Minor corruption (may be auto-fixable)

---

## Recovery Procedures

### Level 1: Minor Corruption (Auto-Recovery)

For `recoverable errors found` or minor issues:

```bash
# Try to dump and rebuild
sqlite3 data/checkout.db ".dump" | sqlite3 data/checkout.db.recovered

# Verify the recovered database
sqlite3 data/checkout.db.recovered "PRAGMA integrity_check;"

# If OK, replace the original
mv data/checkout.db data/checkout.db.corrupted
mv data/checkout.db.recovered data/checkout.db
```

### Level 2: WAL File Issues

If database or WAL files are out of sync:

```bash
# Stop the application first
pkill -f vite

# Remove WAL files (database will be in last committed state)
rm -f data/checkout.db-wal data/checkout.db-shm

# Verify database
sqlite3 data/checkout.db "PRAGMA integrity_check;"

# Restart application
pnpm start
```

### Level 3: Moderate Corruption (Export/Import)

For moderate corruption:

```bash
# Stop the application
pkill -f vite

# Export what can be salvaged
sqlite3 data/checkout.db << 'EOF' > backup.sql
.mode insert
.output backup.sql
SELECT * FROM orders;
SELECT * FROM order_items;
SELECT * FROM products;
.quit
EOF

# Create new database
sqlite3 data/checkout.db.new << 'EOF'
-- Recreate schema definitions (from src/index-server.ts)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  status TEXT NOT NULL,
  total INTEGER NOT NULL,
  pricingResult TEXT NOT NULL,
  shippingAddress TEXT NOT NULL,
  stripePaymentIntentId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL,
  weightInKg INTEGER NOT NULL,
  discount INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  priceInCents INTEGER NOT NULL,
  weightInKg REAL NOT NULL,
  category TEXT
);
.quit
EOF

# Import salvaged data
sqlite3 data/checkout.db.new < backup.sql

# Verify and replace
sqlite3 data/checkout.db.new "PRAGMA integrity_check;"
mv data/checkout.db data/checkout.db.corrupted
mv data/checkout.db.new data/checkout.db

# Restart application
pnpm start
```

### Level 4: Severe Corruption (Restore from Backup)

For `database disk image is malformed`:

```bash
# Stop the application
pkill -f vite

# List available backups
ls -laht backups/checkout.db.*

# Choose the most recent good backup
BACKUP_FILE="backups/checkout.db.20250127_020000"

# Verifybackup integrity
sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;"

# Restore (keep corrupted file for analysis)
mv data/checkout.db data/checkout.db.corrupted.$(date +%Y%m%d_%H%M%S)
cp "$BACKUP_FILE" data/checkout.db

# Restart application
pnpm start

# Verify data完整性
curl http://localhost:5173/api/orders
```

---

## Point-in-Time Recovery

If you need to recover to a specific state (not just backup/restore):

### Using Exported Logs

```bash
# Reorder database from transaction logs
sqlite3 data/checkout.db << 'EOF'
.output recovery.sql
SELECT 'INSERT INTO orders VALUES (' ||
  quote(id) || ',' ||
  quote(userId) || ',' ||
  quote(status) || ',' ||
  total || ',' ||
  quote(pricingResult) || ',' ||
  quote(shippingAddress) || ',' ||
  quote(stripePaymentIntentId) || ',' ||
  createdAt || ',' ||
  updatedAt || ');'
FROM orders
WHERE createdAt >= <TIMESTAMP>
ORDER BY createdAt;
.quit
EOF
```

### Using Debug Endpoints

The application keeps order creation logs:

```bash
# Get recent orders
curl http://localhost:5173/api/orders

# Get specific order details
curl http://localhost:5173/api/orders/order_abc123

# Manually recreate lost orders from logs
```

---

## Maintenance Procedures

### Database Optimization

Run periodically (weekly/monthly):

```bash
# Stop the application
pkill -f vite

# Run VACUUM to reclaim space
sqlite3 data/checkout.db "VACUUM;"

# Analyze for query optimization
sqlite3 data/checkout.db "ANALYZE;"

# Check database size
ls -lh data/checkout.db

# Restart application
pnpm start
```

### Schema Migration

When updating the database schema:

```bash
# 1. Create backup
BACKUP=backup/pre-migration-$(date +%Y%m%d_%H%M%S).db
cp data/checkout.db "$BACKUP"

# 2. Create migration file
cat > migrations/001-add-tracking.sql << 'EOF'
BEGIN TRANSACTION;

ALTER TABLE orders ADD COLUMN trackingId TEXT;
ALTER TABLE orders ADD COLUMN shippedAt INTEGER;

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

COMMIT;
EOF

# 3. Apply migration
sqlite3 data/checkout.db < migrations/001-add-tracking.sql

# 4. Verify
sqlite3 data/checkout.db ".schema orders"

# 5. Test application
pnpm test orders-api.spec.ts
```

---

## Emergency Procedures

### Emergency Rollback

If a deployment introduces critical database issues:

```bash
# Stop the application
pkill -f vite

# Rollback to pre-deployment backup
BACKUP=backup/pre-deployment.db
cp "$BACKUP" data/checkout.db

# Restart
pnpm start

# Verify health
curl http://localhost:5173/readyz
```

### Emergency Data Export

If database is completely failing:

```bash
# Export all data to JSON for preservation
sqlite3 data/checkout.db << 'EOF' > emergency-export.json
.mode json
.output emergency-export.json
SELECT * FROM orders;
SELECT * FROM order_items;
SELECT * FROM products;
.quit
EOF
```

### Database Reset (Last Resort)

⚠️ **WARNING: This deletes all data! Only use when absolutely necessary.**

```bash
# Stop the application
pkill -f vite

# Backup what can be saved
sqlite3 data/checkout.db ".dump" > last-ditch-export.sql

# Reset database
rm -f data/checkout.db data/checkout.db-*

# Rebuild schema (application auto-seeds)
pnpm start

# Verify
curl http://localhost:5173/health
```

---

## Monitoring

### Health Checks

```bash
# Database is readable
sqlite3 data/checkout.db "SELECT 1;"

# Database is writable
sqlite3 data/checkout.db "CREATE TABLE IF NOT EXISTS health_check (id INTEGER PRIMARY KEY);"

# Check file size (growing unexpectedly may indicate corruption or runaway transactions)
watch -n 60 'du -h data/checkout.db'

# Check for WAL file growth (indicates uncommitted transactions)
watch -n 60 'ls -lh data/checkout.db*'
```

### Alert Thresholds

- Database file size grows >100MB/day
- WAL file size grows >50MB (indicates uncommitted transaction)
- Integrity check fails (immediate alert)
- Query latency >1 second P95

---

## Related Documentation
- [Checkout Failure Runbook](/runbooks/checkout-failure.md)
- [Stripe Webhook Runbook](/runbooks/stripe-webhook.md)
- [Deployment Runbook](/runbooks/deployment.md)
