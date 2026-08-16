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
# NOTE: Raw HTML (#1), console.log (#2), alert/confirm (#4) and
# new Error(response.error) (previously grep-based) are now codified
# as AST rules in `@ezstart/eslint-plugin-ezstart`. See
# `packages/eslint-config/src/base.js` and `src/next.js` for activation.
# ============================================================

# ============================================================
# 3. No hardcoded Tailwind classes outside packages/ui
#    className={variable} on UI components is OK (prop forwarding)
#    className="bg-xxx text-xxx" with hardcoded Tailwind is NOT OK
#    SDK packages (pay-sdk, auth-sdk) are excluded — they consume UI components with className
# ============================================================
TAILWIND=$(echo "$FILES" | xargs grep -ln 'className="[^"]*\(bg-\|text-\|flex\|grid\|p-\|m-\|w-\|h-\|border\|rounded\|gap-\|space-\|hidden\|block\|inline\|absolute\|relative\|overflow\)' 2>/dev/null | grep -E '(^|/)packages/' | grep -v '/apps/' | grep -v 'packages/ui/' | grep -v 'packages/pay-sdk/' | grep -v 'packages/auth-sdk/' | grep -v 'packages/ai-sdk/' | grep -v 'packages/capture-sdk/' | grep -v 'packages/pdf-sdk/' | grep -v 'packages/monitoring/' | grep -v 'packages/eslint-plugin-ezstart/' | grep -v 'node_modules' | grep -v '\.test\.' | grep -v '__tests__')

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
# 5. No 'any' type (use proper typing)
# ============================================================
ANY_TYPE=$(echo "$FILES" | xargs grep -ln ': any\b\|: any;\|: any,\|as any\b' 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' | grep -v 'dist/' | grep -v '.d.ts' | grep -v 'packages/pdf-sdk/' | grep -v 'packages/capture-sdk/' | grep -v '\.md$' | grep -v '\.sh$' | grep -v 'CHANGELOG')

if [ -n "$ANY_TYPE" ]; then
  echo ""
  echo "❌ 'any' TYPE DETECTED — Use proper TypeScript typing"
  echo "$ANY_TYPE" | while read f; do
    echo "   $f"
    grep -n ': any\b\|: any;\|: any,\|as any\b' "$f" 2>/dev/null | head -5
  done
  echo ""
  EXIT_CODE=1
fi

# ============================================================
# 6. No secrets in code
# ============================================================
SECRETS=$(echo "$FILES" | xargs grep -ln 'sk_live_[A-Za-z0-9]\{10,\}\|sk_test_[A-Za-z0-9]\{10,\}\|AKIA[A-Z0-9]\{16,\}\|password\s*=\s*["\x27][^"\x27]\+["\x27]' 2>/dev/null | grep -v '.env' | grep -v 'node_modules' | grep -v '.test.' | grep -v '\.md$' | grep -v '\.sh$' | grep -v 'CHANGELOG')

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
# 7. No direct Dialog usage outside UI kit (use <Modal> instead)
#    Modal abstracts Dialog with proper max-h, sticky header/footer, scroll, size variants
# ============================================================
DIRECT_DIALOG=$(echo "$FILES" | xargs grep -lEn '(^|[^a-zA-Z])DialogContent|(^|[^a-zA-Z])DialogHeader|(^|[^a-zA-Z])DialogFooter|(^|[^a-zA-Z])DialogBody' 2>/dev/null | grep -v 'packages/ui/' | grep -v 'packages/eslint-plugin-ezstart/' | grep -v 'node_modules' | grep -v '\.test\.' | grep -v '__tests__' | grep -v '.generated.' | grep -v '\.md$' | grep -v '\.sh$' | grep -v 'CHANGELOG')

if [ -n "$DIRECT_DIALOG" ]; then
  echo ""
  echo "❌ DIRECT DIALOG USAGE DETECTED — Use <Modal> from @ezstart/ui/components instead"
  echo "   Modal abstracts Dialog with proper max-h, sticky header/footer, scroll, size variants"
  echo "$DIRECT_DIALOG" | while read f; do
    echo "   $f"
  done
  echo ""
  EXIT_CODE=1
fi

# ============================================================
# 8. No custom inline Badge — use <Badge> from @ezstart/ui/components
#    Detects span/div/Span/Div with badge-like classes (rounded-* + px-* + bg-*)
# ============================================================
INLINE_BADGE=$(
  for f in $FILES; do
    case "$f" in
      *packages/ui/*|*node_modules*|*.test.*|*.generated.*|*.md|*.sh|*CHANGELOG*) continue ;;
    esac
    # Inline badge pattern: className with inline-flex + rounded-(full|md|sm) + px-[0-9]
    # OR rounded-full + px-[0-9] + text-[xs/sm/10-12px] (small pill style)
    # Excludes container blocks (rounded-md without inline-flex = usually alerts/cards)
    {
      grep -E 'className="[^"]*\binline-flex\b[^"]*"' "$f" 2>/dev/null | \
        grep -E '\brounded-(full|md|sm)\b' | \
        grep -E '\bpx-[0-9]'
      # Match 2: rounded-full + px-[0-9] (small pill, no need for inline-flex)
      grep -E 'className="[^"]*\brounded-full\b[^"]*"' "$f" 2>/dev/null | \
        grep -E '\bpx-[0-9]' | \
        grep -E '\btext-(\[?(10|11|12)px|xs|sm)\b'
    } | grep -q . && echo "$f"
  done
)

if [ -n "$INLINE_BADGE" ]; then
  echo ""
  echo "❌ INLINE BADGE DETECTED — Use <Badge> from @ezstart/ui/components instead"
  echo "   Pattern: span/div with rounded-full + px-* + bg-* = should be <Badge variant=\"...\" />"
  echo "$INLINE_BADGE" | while read f; do
    echo "   $f"
    grep -n 'rounded-\(full\|md\|sm\).*px-' "$f" 2>/dev/null | head -3
  done
  echo ""
  EXIT_CODE=1
fi

# ============================================================
# 9. No custom inline Button — use <Button> from @ezstart/ui/components
#    Detects tags styled as buttons (inline-flex + rounded-* + px-* py-* + bg-primary/secondary/destructive)
#    Hint: <Button asChild> + <a>/<Link> for link-style buttons
# ============================================================
INLINE_BUTTON=$(echo "$FILES" | xargs grep -lE 'className="[^"]*\binline-flex\b[^"]*\brounded-(md|lg|full)\b[^"]*\bpx-[0-9]+\b[^"]*\bpy-[0-9]+\b[^"]*\bbg-(primary|secondary|destructive)' 2>/dev/null | grep -v 'packages/ui/' | grep -v 'node_modules' | grep -v '.test.' | grep -v '.generated.' | grep -v '\.md$' | grep -v '\.sh$' | grep -v 'CHANGELOG')

if [ -n "$INLINE_BUTTON" ]; then
  echo ""
  echo "❌ INLINE BUTTON DETECTED — Use <Button> from @ezstart/ui/components instead"
  echo "   Pattern: tag with inline-flex + rounded-* + px-* py-* + bg-primary/secondary/destructive"
  echo "   Hint: <Button variant=\"default|primary|destructive\" /> + asChild for links"
  echo "$INLINE_BUTTON" | while read f; do
    echo "   $f"
    grep -n 'inline-flex.*rounded.*px-.*py-.*bg-' "$f" 2>/dev/null | head -2
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
