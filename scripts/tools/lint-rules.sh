#!/bin/bash
# lint-rules.sh — Pre-commit validation for @ezstart coding rules
# Runs on staged .ts/.tsx files via lint-staged
# Blocks commit if any critical rule is violated

EXIT_CODE=0
FILES="$@"

if [ -z "$FILES" ]; then
  echo "No files to check"
  exit 0
fi

# ============================================================
# 1. No raw HTML tags outside packages/ui
# ============================================================
RAW_HTML=$(echo "$FILES" | xargs grep -ln '<div \|<div>\|<p \|<p>\|<span \|<span>\|<table \|<table>\|<thead\|<tbody\|<button \|<button>\|<input \|<input>' 2>/dev/null | grep -v 'packages/ui/' | grep -v 'node_modules' | grep -v '.test.')

if [ -n "$RAW_HTML" ]; then
  echo ""
  echo "❌ RAW HTML DETECTED — Use @ezstart/ui components (Div, P, Span, Card, DataTable, Button, Input...)"
  echo "$RAW_HTML" | while read f; do
    echo "   $f"
    grep -n '<div \|<div>\|<p \|<p>\|<span \|<span>\|<table \|<table>\|<thead\|<tbody\|<button \|<button>\|<input \|<input>' "$f" 2>/dev/null | head -5
  done
  echo ""
  EXIT_CODE=1
fi

# ============================================================
# 2. No console.log/warn/error (use @ezstart/logger)
# ============================================================
CONSOLE=$(echo "$FILES" | xargs grep -ln 'console\.\(log\|warn\|error\)' 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' | grep -v 'vitest.config' | grep -v 'scripts/')

if [ -n "$CONSOLE" ]; then
  echo ""
  echo "❌ CONSOLE.LOG DETECTED — Use @ezstart/logger (logger.debug/info/warn/error)"
  echo "$CONSOLE" | while read f; do
    echo "   $f"
    grep -n 'console\.\(log\|warn\|error\)' "$f" 2>/dev/null | head -3
  done
  echo ""
  EXIT_CODE=1
fi

# ============================================================
# 3. No hardcoded Tailwind classes outside packages/ui
#    className={variable} on UI components is OK (prop forwarding)
#    className="bg-xxx text-xxx" with hardcoded Tailwind is NOT OK
# ============================================================
TAILWIND=$(echo "$FILES" | xargs grep -ln 'className="[^"]*\(bg-\|text-\|flex\|grid\|p-\|m-\|w-\|h-\|border\|rounded\|gap-\|space-\|hidden\|block\|inline\|absolute\|relative\|overflow\)' 2>/dev/null | grep 'packages/' | grep -v 'packages/ui/' | grep -v 'node_modules')

if [ -n "$TAILWIND" ]; then
  echo ""
  echo "❌ HARDCODED TAILWIND OUTSIDE packages/ui — Use component props/variants instead"
  echo "$TAILWIND" | while read f; do
    echo "   $f"
    grep -n 'className="[^"]*\(bg-\|text-\|flex\|grid\|p-\|m-\|border\|rounded\)' "$f" 2>/dev/null | head -3
  done
  echo ""
  EXIT_CODE=1
fi

# ============================================================
# 4. No secrets in code
# ============================================================
SECRETS=$(echo "$FILES" | xargs grep -ln 'sk_live_\|sk_test_\|AKIA[A-Z0-9]\|password\s*=\s*["\x27][^"\x27]\+["\x27]' 2>/dev/null | grep -v '.env' | grep -v 'node_modules' | grep -v '.test.')

if [ -n "$SECRETS" ]; then
  echo ""
  echo "❌ POTENTIAL SECRETS DETECTED — Never hardcode API keys, passwords, or tokens"
  echo "$SECRETS" | while read f; do
    echo "   $f"
  done
  echo ""
  EXIT_CODE=1
fi

# ============================================================
# Result
# ============================================================
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Rules check passed"
fi

exit $EXIT_CODE
