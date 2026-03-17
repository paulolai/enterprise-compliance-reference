#!/bin/bash

# Configuration
SOURCE_DIR=$(pwd)
TARGET_NAME="ai-clinical-guardrails"
TARGET_DIR="../$TARGET_NAME"

echo "🚀 Starting extraction of AI Pattern to $TARGET_DIR..."

# 1. Create target directory
if [ -d "$TARGET_DIR" ]; then
    echo "❌ Error: $TARGET_DIR already exists. Please remove it or choose a different name."
    exit 1
fi

mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR" || exit

# 2. Initialize Git
git init -b main

# 3. Copy Global Configs
echo "📦 Copying global configurations and DX tools..."
cp "$SOURCE_DIR/package.json" .
cp "$SOURCE_DIR/pnpm-workspace.yaml" .
cp "$SOURCE_DIR/tsconfig.json" .
cp "$SOURCE_DIR/tsconfig.base.json" .
cp "$SOURCE_DIR/.gitignore" .
cp "$SOURCE_DIR/.gitattributes" .
cp "$SOURCE_DIR/pnpm-lock.yaml" .
cp "$SOURCE_DIR/LICENSE" .
cp "$SOURCE_DIR/AGENTS.md" .
cp "$SOURCE_DIR/CLAUDE.md" .

# 4. Copy CI/CD and DX folders
echo "🔧 Setting up CI/CD and Husky..."
cp -r "$SOURCE_DIR/.github" . 2>/dev/null || true
cp -r "$SOURCE_DIR/.husky" . 2>/dev/null || true
mkdir -p scripts
# Overwrite with a simplified test-runner
cat << 'EOF' > scripts/test-runner.ts
import { execSync } from 'child_process';
import path from 'path';

console.log('\n🚀 Starting Verification Run...\n');

try {
  console.log('[Test Runner] 🧪 Running Unit & Invariant Tests (Vitest)...\n');
  execSync('pnpm run test:unit', { 
    stdio: 'inherit', 
    cwd: path.resolve(process.cwd(), 'packages/domain') 
  });
  console.log('\n[Test Runner] ✅ All Invariants Verified.');
} catch (e) {
  console.log('\n[Test Runner] ❌ Verification Failed.');
  process.exit(1);
}

console.log('\n[Test Runner] 📝 Attestation Reports generated in packages/domain/reports/');
EOF

# 5. Copy Blueprints
echo "📝 Setting up README and PLAN..."
cp "$SOURCE_DIR/AI_PATTERN_BLUEPRINT.md" README.md
cp "$SOURCE_DIR/HEALTHTECH_DEMO_PLAN.md" PLAN.md
cp "$SOURCE_DIR/AGENTS_HEALTHTECH_TODO.md" AGENTS_TODO.md

# 6. Extract Core Packages
echo "🧠 Extracting Domain and Shared packages..."
mkdir -p packages/domain
cp -r "$SOURCE_DIR/packages/domain/src" packages/domain/
cp -r "$SOURCE_DIR/packages/domain/test" packages/domain/
cp "$SOURCE_DIR/packages/domain/package.json" packages/domain/
cp "$SOURCE_DIR/packages/domain/tsconfig.json" packages/domain/
cp "$SOURCE_DIR"/packages/domain/vitest.config*.ts packages/domain/ 2>/dev/null || true

mkdir -p packages/shared
cp -r "$SOURCE_DIR/packages/shared/src" packages/shared/
cp -r "$SOURCE_DIR/packages/shared/fixtures" packages/shared/
cp "$SOURCE_DIR/packages/shared/package.json" packages/shared/
cp "$SOURCE_DIR/packages/shared/tsconfig.json" packages/shared/

# 7. Cleanup Target Files
echo "🧹 Cleaning up target configurations..."

# Remove client, server, and root test dir from workspace
sed -i '/- .packages\/client./d' pnpm-workspace.yaml
sed -i '/- .packages\/server./d' pnpm-workspace.yaml
sed -i '/- .test./d' pnpm-workspace.yaml

# Clean up root tsconfig references
sed -i '/"path": "packages\/client"/d' tsconfig.json
sed -i '/"path": "test"/d' tsconfig.json
# Remove potential trailing comma issues in JSON (basic fix)
sed -i 's/}, \s*]/}]/g' tsconfig.json

# Remove specific scripts from root package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
delete pkg.scripts['dev:frontend'];
delete pkg.scripts['dev:backend'];
delete pkg.scripts['test:e2e'];
delete pkg.scripts['test:all'];
pkg.scripts['test'] = 'npx tsx scripts/test-runner.ts';
delete pkg.dependencies['better-sqlite3'];
delete pkg.dependencies['stripe'];
delete pkg.devDependencies['@playwright/test'];
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# 8. Finalize
echo "✅ Extraction complete!"
echo ""
echo "Next steps:"
echo "1. cd $TARGET_DIR"
echo "2. pnpm install"
echo "3. pnpm run test"
echo "4. git add . && git commit -m 'feat: initial extraction from enterprise-compliance-reference'"
echo "5. Create a new repo on GitHub and push!"
