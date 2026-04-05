#!/bin/bash
# audit-rules.sh — Full monorepo audit for coding rules compliance
# Usage:
#   bash scripts/tools/audit-rules.sh                    # Audit tout
#   bash scripts/tools/audit-rules.sh packages/pay-sdk   # Audit un package
#   bash scripts/tools/audit-rules.sh apps/ezpay         # Audit une app

TARGET="${1:-.}"
EXIT_CODE=0

echo "🔍 Auditing: $TARGET"
echo "================================================"

# ============================================================
# 1. Raw HTML tags outside packages/ui
# ============================================================
echo ""
echo "--- Check 1: Raw HTML tags ---"
COUNT=$(grep -rn '<div \|<div>\|<p \|<p>\|<span \|<span>\|<table \|<table>\|<thead\|<tbody\|<button \|<button>\|<input \|<input>' "$TARGET" --include="*.tsx" --include="*.ts" | grep -v 'packages/ui/' | grep -v 'node_modules' | grep -v '.test.' | grep -v 'dist/' | wc -l)

if [ "$COUNT" -gt 0 ]; then
  echo "❌ $COUNT violations — Raw HTML found outside packages/ui"
  grep -rn '<div \|<div>\|<p \|<p>\|<span \|<span>\|<table \|<table>\|<thead\|<tbody\|<button \|<button>\|<input \|<input>' "$TARGET" --include="*.tsx" --include="*.ts" | grep -v 'packages/ui/' | grep -v 'node_modules' | grep -v '.test.' | grep -v 'dist/' | head -20
  EXIT_CODE=1
else
  echo "✅ No raw HTML"
fi

# ============================================================
# 2. console.log/warn/error
# ============================================================
echo ""
echo "--- Check 2: console.log ---"
COUNT=$(grep -rn 'console\.\(log\|warn\|error\)' "$TARGET" --include="*.tsx" --include="*.ts" | grep -v 'node_modules' | grep -v '.test.' | grep -v 'dist/' | grep -v 'vitest.config' | grep -v 'scripts/' | grep -v 'eslint' | wc -l)

if [ "$COUNT" -gt 0 ]; then
  echo "❌ $COUNT violations — Use @ezstart/logger instead"
  grep -rn 'console\.\(log\|warn\|error\)' "$TARGET" --include="*.tsx" --include="*.ts" | grep -v 'node_modules' | grep -v '.test.' | grep -v 'dist/' | grep -v 'vitest.config' | grep -v 'scripts/' | grep -v 'eslint' | head -20
  EXIT_CODE=1
else
  echo "✅ No console.log"
fi

# ============================================================
# 3. Hardcoded Tailwind outside packages/ui
# ============================================================
echo ""
echo "--- Check 3: Hardcoded Tailwind outside packages/ui ---"
COUNT=$(grep -rn 'className="[^"]*\(bg-\|text-\|flex\|grid\|p-\|m-\|w-\|h-\|border\|rounded\|gap-\|space-\|hidden\|block\|inline\|absolute\|relative\|overflow\)' "$TARGET" --include="*.tsx" --include="*.ts" | grep 'packages/' | grep -v 'packages/ui/' | grep -v 'node_modules' | grep -v 'dist/' | wc -l)

if [ "$COUNT" -gt 0 ]; then
  echo "❌ $COUNT violations — Hardcoded Tailwind in packages (only packages/ui allowed)"
  grep -rn 'className="[^"]*\(bg-\|text-\|flex\|grid\|p-\|m-\|border\|rounded\)' "$TARGET" --include="*.tsx" --include="*.ts" | grep 'packages/' | grep -v 'packages/ui/' | grep -v 'node_modules' | grep -v 'dist/' | head -20
  EXIT_CODE=1
else
  echo "✅ No hardcoded Tailwind outside packages/ui"
fi

# ============================================================
# 4. Secrets
# ============================================================
echo ""
echo "--- Check 4: Secrets ---"
COUNT=$(grep -rn 'sk_live_\|sk_test_\|AKIA[A-Z0-9]' "$TARGET" --include="*.tsx" --include="*.ts" | grep -v '.env' | grep -v 'node_modules' | grep -v 'dist/' | grep -v '.test.' | wc -l)

if [ "$COUNT" -gt 0 ]; then
  echo "❌ $COUNT violations — Potential secrets in code"
  grep -rn 'sk_live_\|sk_test_\|AKIA[A-Z0-9]' "$TARGET" --include="*.tsx" --include="*.ts" | grep -v '.env' | grep -v 'node_modules' | grep -v 'dist/' | grep -v '.test.' | head -10
  EXIT_CODE=1
else
  echo "✅ No secrets"
fi

# ============================================================
# Summary
# ============================================================
echo ""
echo "================================================"
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ AUDIT PASSED — All checks clean"
else
  echo "❌ AUDIT FAILED — Fix violations above"
fi

exit $EXIT_CODE
