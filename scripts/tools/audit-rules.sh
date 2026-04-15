#!/bin/bash
# audit-rules.sh — Targeted audit for coding rules + documentation compliance
# Usage:
#   bash scripts/tools/audit-rules.sh packages/pay-sdk   # Audit un package
#   bash scripts/tools/audit-rules.sh apps/ezpay         # Audit une app
#   bash scripts/tools/audit-rules.sh .                   # Audit tout (rare)

TARGET="${1:-.}"
EXIT_CODE=0
WARN_COUNT=0

echo "🔍 Auditing: $TARGET"
echo "================================================"

# ============================================================
# PART 1 — CODE COMPLIANCE
# ============================================================
echo ""
echo "📝 CODE COMPLIANCE"
echo "------------------------------------------------"

# 1. Raw HTML tags outside packages/ui
echo ""
echo "--- Raw HTML tags ---"
COUNT=$(grep -rn '<div \|<div>\|<p \|<p>\|<span \|<span>\|<table \|<table>\|<thead\|<tbody\|<button \|<button>\|<input \|<input>' "$TARGET" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v 'packages/ui/' | grep -v 'node_modules' | grep -v '.test.' | grep -v 'dist/' | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "❌ $COUNT violations — Use @ezstart/ui (Div, P, Span, Card, DataTable...)"
  grep -rn '<div \|<div>\|<p \|<p>\|<span \|<span>\|<table \|<table>\|<thead\|<tbody\|<button \|<button>\|<input \|<input>' "$TARGET" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v 'packages/ui/' | grep -v 'node_modules' | grep -v '.test.' | grep -v 'dist/' | head -10
  EXIT_CODE=1
else
  echo "✅ No raw HTML"
fi

# 2. console.log
echo ""
echo "--- console.log ---"
COUNT=$(grep -rn 'console\.\(log\|warn\|error\)' "$TARGET" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' | grep -v 'dist/' | grep -v 'vitest.config' | grep -v 'scripts/' | grep -v 'eslint' | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "❌ $COUNT violations — Use @ezstart/logger"
  grep -rn 'console\.\(log\|warn\|error\)' "$TARGET" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' | grep -v 'dist/' | grep -v 'vitest.config' | grep -v 'scripts/' | grep -v 'eslint' | head -10
  EXIT_CODE=1
else
  echo "✅ No console.log"
fi

# 3. Hardcoded Tailwind outside packages/ui
echo ""
echo "--- Hardcoded Tailwind in packages ---"
COUNT=$(grep -rn 'className="[^"]*\(bg-\|text-\|flex\|grid\|p-\|m-\|w-\|h-\|border\|rounded\|gap-\|space-\|hidden\|block\|inline\|absolute\|relative\|overflow\)' "$TARGET" --include="*.tsx" --include="*.ts" 2>/dev/null | grep 'packages/' | grep -v 'packages/ui/' | grep -v 'node_modules' | grep -v 'dist/' | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "❌ $COUNT violations — Only packages/ui may use Tailwind"
  grep -rn 'className="[^"]*\(bg-\|text-\|flex\|grid\|p-\|m-\|border\|rounded\)' "$TARGET" --include="*.tsx" --include="*.ts" 2>/dev/null | grep 'packages/' | grep -v 'packages/ui/' | grep -v 'node_modules' | grep -v 'dist/' | head -10
  EXIT_CODE=1
else
  echo "✅ No hardcoded Tailwind outside packages/ui"
fi

# 4. Secrets
echo ""
echo "--- Secrets ---"
COUNT=$(grep -rn 'sk_live_\|sk_test_\|AKIA[A-Z0-9]' "$TARGET" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v '.env' | grep -v 'node_modules' | grep -v 'dist/' | grep -v '.test.' | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "❌ $COUNT violations — Secrets in code"
  grep -rn 'sk_live_\|sk_test_\|AKIA[A-Z0-9]' "$TARGET" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v '.env' | grep -v 'node_modules' | grep -v 'dist/' | grep -v '.test.' | head -5
  EXIT_CODE=1
else
  echo "✅ No secrets"
fi

# ============================================================
# PART 2 — DOCUMENTATION COMPLIANCE
# ============================================================
echo ""
echo ""
echo "📚 DOCUMENTATION COMPLIANCE"
echo "------------------------------------------------"

# 5. README exists for packages
if echo "$TARGET" | grep -q 'packages/'; then
  PKG_NAME=$(echo "$TARGET" | sed 's|/$||')
  echo ""
  echo "--- Package README ---"
  if [ -f "$PKG_NAME/README.md" ]; then
    LINES=$(wc -l < "$PKG_NAME/README.md")
    echo "✅ README.md exists ($LINES lines)"
  else
    echo "⚠️  README.md missing for $PKG_NAME"
    WARN_COUNT=$((WARN_COUNT + 1))
  fi
fi

# 6. Root BACKLOG (single source of truth for the monorepo)
echo ""
echo "--- Root BACKLOG ---"
if [ -f "BACKLOG.md" ]; then
  LINES=$(wc -l < "BACKLOG.md")
  ACTIVE=$(grep -c '^- \[ \]' "BACKLOG.md" 2>/dev/null || echo 0)
  DONE_PENDING_ARCHIVE=$(grep -c '^- \[x\]' "BACKLOG.md" 2>/dev/null || echo 0)
  echo "✅ BACKLOG.md ($LINES lines) — active: $ACTIVE, done awaiting archive: $DONE_PENDING_ARCHIVE"
  if [ -f "BACKLOG-HISTORY.md" ]; then
    HIST_LINES=$(wc -l < "BACKLOG-HISTORY.md")
    echo "✅ BACKLOG-HISTORY.md ($HIST_LINES lines)"
  else
    echo "⚠️  BACKLOG-HISTORY.md missing"
    WARN_COUNT=$((WARN_COUNT + 1))
  fi
else
  echo "⚠️  BACKLOG.md missing at repo root"
  WARN_COUNT=$((WARN_COUNT + 1))
fi

# 7. E2E-TESTS exists for apps with web
if echo "$TARGET" | grep -q 'apps/'; then
  APP_NAME=$(echo "$TARGET" | sed 's|/$||')
  echo ""
  echo "--- E2E Tests ---"
  if [ -f "$APP_NAME/E2E-TESTS.md" ]; then
    TOTAL=$(grep -c '|' "$APP_NAME/E2E-TESTS.md" 2>/dev/null || echo 0)
    PASS=$(grep -c '✅' "$APP_NAME/E2E-TESTS.md" 2>/dev/null || echo 0)
    PENDING=$(grep -c '⏳' "$APP_NAME/E2E-TESTS.md" 2>/dev/null || echo 0)
    FAIL=$(grep -c '❌' "$APP_NAME/E2E-TESTS.md" 2>/dev/null || echo 0)
    echo "✅ E2E-TESTS.md exists — ✅ $PASS | ⏳ $PENDING | ❌ $FAIL"
    if [ "$FAIL" -gt 0 ]; then
      echo "   ⚠️  $FAIL failing tests need attention"
      WARN_COUNT=$((WARN_COUNT + 1))
    fi
  else
    if [ -d "$APP_NAME/web" ]; then
      echo "⚠️  E2E-TESTS.md missing (app has web frontend)"
      WARN_COUNT=$((WARN_COUNT + 1))
    else
      echo "— No web frontend, E2E-TESTS.md not required"
    fi
  fi
fi

# 8. .env.example exists for APIs
if echo "$TARGET" | grep -q 'apps/'; then
  APP_NAME=$(echo "$TARGET" | sed 's|/$||')
  if [ -d "$APP_NAME/api" ]; then
    echo ""
    echo "--- API .env.example ---"
    if [ -f "$APP_NAME/api/.env.example" ]; then
      VARS=$(grep -c '=' "$APP_NAME/api/.env.example" 2>/dev/null || echo 0)
      echo "✅ .env.example exists ($VARS variables)"
    else
      echo "⚠️  .env.example missing for $APP_NAME/api"
      WARN_COUNT=$((WARN_COUNT + 1))
    fi
  fi
fi

# 9. package.json exports check for packages
if echo "$TARGET" | grep -q 'packages/'; then
  PKG_NAME=$(echo "$TARGET" | sed 's|/$||')
  echo ""
  echo "--- Package exports ---"
  if [ -f "$PKG_NAME/package.json" ]; then
    HAS_MAIN=$(grep -c '"main"' "$PKG_NAME/package.json" 2>/dev/null || echo 0)
    HAS_EXPORTS=$(grep -c '"exports"' "$PKG_NAME/package.json" 2>/dev/null || echo 0)
    if [ "$HAS_MAIN" -gt 0 ] || [ "$HAS_EXPORTS" -gt 0 ]; then
      echo "✅ package.json has main/exports"
    else
      echo "⚠️  package.json missing main or exports field"
      WARN_COUNT=$((WARN_COUNT + 1))
    fi
  fi
  if [ -f "$PKG_NAME/src/index.ts" ]; then
    echo "✅ src/index.ts entry point exists"
  else
    echo "⚠️  src/index.ts missing"
    WARN_COUNT=$((WARN_COUNT + 1))
  fi
fi

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo ""
echo "================================================"
if [ $EXIT_CODE -eq 0 ] && [ $WARN_COUNT -eq 0 ]; then
  echo "✅ AUDIT PASSED — Code + docs clean"
elif [ $EXIT_CODE -eq 0 ]; then
  echo "⚠️  AUDIT PASSED with $WARN_COUNT warnings — Code clean, docs need attention"
else
  echo "❌ AUDIT FAILED — Fix code violations above"
  if [ $WARN_COUNT -gt 0 ]; then
    echo "   + $WARN_COUNT doc warnings"
  fi
fi

exit $EXIT_CODE
