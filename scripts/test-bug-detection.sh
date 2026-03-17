#!/bin/bash
# Test Bug Detection Script
# Intentionally introduces bugs and verifies tests catch them

set -e

echo "=============================================="
echo "BUG DETECTION TEST"
echo "=============================================="
echo ""

# Function to run tests and check result
run_test() {
    local test_name=$1
    local test_file=$2
    
    echo "Running: $test_name"
    echo "----------------------------------------------"
    
    if npx vitest run "$test_file" --reporter=verbose 2>&1 | grep -q "FAIL"; then
        echo "✅ TEST CAUGHT THE BUG"
        echo ""
        return 0
    else
        echo "❌ TEST DID NOT CATCH THE BUG"
        echo ""
        return 1
    fi
}

echo "Current state: Introducing bugs..."
echo ""

# Bug 1: Broken import from shared module
echo "Bug 1: Broken import in health.ts"
echo "  Importing 'db' from shared module (which doesn't export it)"
sed -i "s|from '../../db'|from '@executable-specs/shared/index-server'|g" packages/server/src/server/routes/health.ts
echo ""

# Bug 2: Missing export
echo "Bug 2: Missing export in env.ts"
echo "  Commenting out 'env' export"
sed -i 's/^export const env =/\/\/ export const env =/' packages/server/src/lib/env.ts 2>/dev/null || echo "  (env export not present - that's the bug!)"
echo ""

# Bug 3: Vite global in server code
echo "Bug 3: Vite global in rate-limit.ts"
echo "  Using import.meta.env.DEV instead of process.env.NODE_ENV"
sed -i 's/process.env.NODE_ENV === .development. || process.env.NODE_ENV === .test./import.meta.env.DEV/g' packages/server/src/server/middleware/rate-limit.ts
echo ""

# Bug 4: NEW BUG - Circular dependency
echo "Bug 4: NEW - Circular dependency"
echo "  Adding circular import between modules"
cat >> packages/server/src/lib/logger.ts << 'EOF'
// Intentional circular dependency for testing
import { db } from '../db';
export function logToDb(msg: string) {
  // This creates a circular dependency if db imports logger
}
EOF
echo ""

# Bug 5: NEW BUG - Undefined variable access
echo "Bug 5: NEW - Undefined variable access"
echo "  Using undefined config variable"
sed -i 's/const port = env.PORT;/const port = config.PORT;/g' packages/server/src/server/standalone.ts
echo ""

echo "=============================================="
echo "Running tests to verify bug detection..."
echo "=============================================="
echo ""

# Test 1: Server startup test
cd packages/server
if run_test "Server Startup Test" "test/server-startup.integration.test.ts"; then
    echo "✅ Server startup test successfully detects issues"
else
    echo "❌ Server startup test missed issues"
fi

# Test 2: Module contracts test
if run_test "Module Contracts Test" "test/module-contracts.integration.test.ts"; then
    echo "✅ Module contracts test successfully detects issues"
else
    echo "❌ Module contracts test missed issues"
fi

echo ""
echo "=============================================="
echo "BUG DETECTION TEST COMPLETE"
echo "=============================================="
echo ""
echo "Summary:"
echo "- 5 bugs intentionally introduced"
echo "- General-purpose tests should catch startup/import/env issues"
echo "- Check test output above to see which bugs were caught"
