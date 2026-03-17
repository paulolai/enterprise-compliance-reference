#!/bin/bash
# Introduce bugs to test detection

set -e

echo "=== INTRODUCING BUGS TO TEST DETECTION ==="
echo ""

BUG_COUNT=0

# Bug 1: Broken import from shared module (restore the old bug)
echo "Bug 1: Broken import in health.ts"
echo "  Before: import { db } from '../../db';"
echo "  After:  import { db } from '@executable-specs/shared/index-server';"
if grep -q "from '../../db'" packages/server/src/server/routes/health.ts; then
    sed -i "s|from '../../db'|from '@executable-specs/shared/index-server'|g" packages/server/src/server/routes/health.ts
    echo "  ✓ Bug introduced"
    ((BUG_COUNT++))
else
    echo "  ⚠ Already broken or pattern not found"
fi
echo ""

# Bug 2: Missing export (remove env export)
echo "Bug 2: Remove env export from lib/env.ts"
if grep -q "^export const env =" packages/server/src/lib/env.ts; then
    sed -i 's/^export const env =/\/\/ BUG: Removed export - export const env =/' packages/server/src/lib/env.ts
    echo "  ✓ Bug introduced"
    ((BUG_COUNT++))
else
    echo "  ⚠ Already removed or pattern not found"
fi
echo ""

# Bug 3: Vite global in server code
echo "Bug 3: Use import.meta.env in rate-limit.ts"
if grep -q "process.env.NODE_ENV" packages/server/src/server/middleware/rate-limit.ts; then
    sed -i 's/process.env.NODE_ENV === .development. || process.env.NODE_ENV === .test./import.meta.env.DEV/g' packages/server/src/server/middleware/rate-limit.ts
    echo "  ✓ Bug introduced"
    ((BUG_COUNT++))
else
    echo "  ⚠ Pattern not found"
fi
echo ""

# Bug 4: Circular dependency
echo "Bug 4: Add circular dependency in logger.ts"
if ! grep -q "import.*db.*from.*db" packages/server/src/lib/logger.ts; then
    cat >> packages/server/src/lib/logger.ts << 'EOF'

// BUG: Circular dependency - logger imports db, db might import logger
import { db } from '../db';
export function logToDb(message: string) {
  console.log('Logging to db:', message);
}
EOF
    echo "  ✓ Bug introduced"
    ((BUG_COUNT++))
else
    echo "  ⚠ Already has circular import"
fi
echo ""

# Bug 5: Reference to undefined variable
echo "Bug 5: Use undefined variable in standalone.ts"
if grep -q "const port = env.PORT" packages/server/src/server/standalone.ts; then
    sed -i 's/const port = env.PORT;/const port = config.PORT; \/\/ BUG: config is undefined/' packages/server/src/server/standalone.ts
    echo "  ✓ Bug introduced"
    ((BUG_COUNT++))
else
    echo "  ⚠ Pattern not found"
fi
echo ""

echo "=== BUGS INTRODUCED: $BUG_COUNT ==="
echo ""
echo "Now run the tests to see which bugs are caught:"
echo "  cd packages/server && npx vitest run test/"
