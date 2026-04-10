# Design Token System — Audit & Validation Report

**Date:** 2026-04-10
**Scope:** packages/ui token pattern refactoring (4 phases)

---

## Summary

| Metric | Before | After | Change |
|---|---|---|---|
| Components in registry | 210 | 227 | +17 (Tag aliases) |
| Token providers | 3 (Card, Table, FloatingPanel) | 9 (+Modal, Dialog, Sheet, AlertDialog, Accordion, Tabs) | +6 |
| Token consumers | 16 | 38+ | +22 (Tag aliases + new Context consumers) |
| `size` coverage | 29 props · 3P · 46C | 70 props · 7P · 68C | 2.4x |
| `density` coverage | 7 props · 2P · 28C | 36 props · 6P · 49C | 5x |
| `intent` coverage | 2 props · 22C | 26 props · 2P · 5C | 13x props |
| `radius` providers | 1P | 2P (+Dialog) | +1 |
| Tag aliases detected | 0 | 38 | +38 |
| Deprecated tokens flagged | 0 | 9 (tableSize, textSize, etc.) | +9 |
| Candidate tokens (tightened) | 12 | 8 | -4 reclassified |
| New HTML tag aliases | 20 (existing) | 38 | +18 |
| Typecheck | OK | OK (35/35) | No regressions |

---

## Phase 1 — Registry Generator Refactoring

### Changes
- **Tag alias detection**: Generator now scans `createAlias()` calls in `aliases.tsx` and generates proper registry entries with `inheritsTokens: ['size', 'density', 'intent']`
- **Multi-line export bug fix**: Fixed regex that was stripping inline comments between named exports, causing 10+ aliases to be missed
- **Token classification tightened**: Removed `bgMode`, `padding`, `columns`, `height` from candidate list → now `specific`
- **`deprecatedBy` field added**: New optional field in `TokenInfo` type. 9 tokens flagged:

| Deprecated Token | Replace With | Component |
|---|---|---|
| `tableSize` | `density` | DataTable |
| `textSize` | `size` | Spinner |
| `fancyPulseSize` | `size` | Spinner |
| `spacing` | `density` | SkeletonText |
| `cardVariant` | `variant` | FeatureGrid |
| `headingVariant` | `variant` | CommandGroup |
| `actionButtonVariant` | `intent` | AlertDialog |
| `bgColor` | `intent` | CTA |
| `alignment` | `align` | Hero |

### Files modified
- `scripts/generators/generate-ui-registry.js`
- `apps/ezstart/web/src/app/[locale]/(views)/packages/ui/inspector/registry.ts` (auto-generated)

---

## Phase 1b — New Tag Aliases

### 18 new aliases added

| Category | Tags | Variants |
|---|---|---|
| Text | `Em`, `Small`, `Mark` | sizeText |
| Definition lists | `Dl`, `Dt`, `Dd` | container / text |
| Code/Preformatted | `Pre`, `Code`, `Blockquote` | sizeText + base CSS |
| Media | `Figure`, `Figcaption` | container / text |
| Form grouping | `Fieldset`, `Legend` | container + intent |
| Disclosure | `Details`, `Summary` | container / text |
| Misc | `Hr`, `Time`, `Address` | minimal pass-through |

### Skipped (dedicated components exist)
- `Label` → `forms/label.tsx`
- `Table/Thead/Tbody/Tr/Th/Td` → `data-display/table.tsx`
- `Img` → `media/img.tsx`

### Files modified
- `packages/ui/src/lib/design-system/variants.ts` (18 new tag entries + tagVariantsMeta)
- `packages/ui/src/components/tag/src/types.ts` (SupportedAs extended)
- `packages/ui/src/components/tag/src/aliases.tsx` (18 new createAlias calls)
- `packages/ui/src/components/tag/index.ts` (exports)

---

## Phase 2 — DesignTokenProvider on Containers

### 6 new providers + 2 new consumers

| Component | Token | Before | After |
|---|---|---|---|
| **Modal** | `size` | Consumes only | Consumes + **provides** to Dialog children |
| **DialogContent** | `radius` | Consumes only | Consumes + **provides** to content children |
| **SheetContent** | `size`, `density` | No tokens | New props + **provides** via DesignTokenProvider |
| **AlertDialogContent** | `density` | No tokens | New prop + **provides** via DesignTokenProvider |
| **Accordion** | `density`, `size` | Hardcoded tokens.ts import | New props + **provides** + AccordionTrigger uses Context |
| **Tabs** | `size`, `density` | Hardcoded touchHeight | New props + **provides** + TabsList uses Context |
| **Label** | `size` | Hardcoded fontSize.base | Now reads inherited size via useDesignTokens() |
| **Checkbox** | `size` | Hardcoded touchSmall | Now reads inherited size via useDesignTokens() |

### Files modified
- `packages/ui/src/components/overlay/modal.tsx`
- `packages/ui/src/components/overlay/dialog.tsx`
- `packages/ui/src/components/overlay/sheet.tsx`
- `packages/ui/src/components/feedback/alert-dialog.tsx`
- `packages/ui/src/components/data-display/accordion.tsx`
- `packages/ui/src/components/navigation/tabs.tsx`
- `packages/ui/src/components/forms/label.tsx`
- `packages/ui/src/components/forms/checkbox.tsx`

---

## Phase 3 — Deprecate Duplicate Tokens

### DataTable: `tableSize` → `density`

- Added `density` prop (standard token)
- `tableSize` marked `@deprecated` with JSDoc
- Resolution: `density` > `tableSize` > `inherited.density` > `'default'`
- Maps `relaxed` (standard) → `comfortable` (DataTable-specific)
- 100% backwards compatible

### File modified
- `packages/ui/src/components/data-display/data-table.tsx`

---

## Phase 4 — Migrate Direct Token Imports to Context

Merged into Phase 2 agent. Components that previously hardcoded values from `tokens.ts` now read from `useDesignTokens()` with fallback to previous defaults:

| Component | Before | After |
|---|---|---|
| AccordionTrigger | `paddingY.lg` hardcoded | `densityPadding[inherited.density]` with fallback to `paddingY.lg` |
| TabsList | `touchHeight.default` hardcoded | `sizeClass[inherited.size]` with fallback to `touchHeight.default` |
| Label | `fontSize.base` hardcoded | `sizeClass[inherited.size]` with fallback to `fontSize.base` |
| Checkbox | `touchSmall.checkbox` hardcoded | `sizeClass[inherited.size]` with fallback to `touchSmall.checkbox` |

---

## E2E Validation (MCP Chrome DevTools)

### Test 1: Card → CardContent → Button chain
- **Result:** PASS — size, density, radius propagate through all 3 levels
- **Screenshot:** Card pushes tokens, CardContent receives, Button receives and applies

### Test 2: Card → CardContent → H1 (Tag alias) chain
- **Result:** PASS — H1 receives size + density from Card via Context
- **Rendered output:** Shows all inherited token values correctly

### Test 3: Modal (standalone)
- **Result:** PASS — Modal now shows `↓ pushes size` and `provides: size`
- **Before:** `✗ size — no provider in chain` (red) with no provides

### Test 4: Accordion (standalone)
- **Result:** PASS — Shows `↓ pushes size` `↓ pushes density`, token controls for density (compact/default/relaxed)
- **Before:** "No tokens configured"

### Test 5: DataTable (standalone)
- **Result:** PASS — Shows both `density` (auto-drill, standard) and `tableSize` (per-component, deprecated)
- **inherits: density** visible

### Test 6: Inspector main page — token counts
- **Result:** PASS — All counts match expected post-refactoring values

### Test 7: Full monorepo typecheck
- **Result:** PASS — 35/35 packages, 0 errors

---

## Backwards Compatibility

All changes are **100% backwards compatible**:
- No existing props removed
- No existing behavior changed when tokens are not provided
- `tableSize` still works (just deprecated)
- Components without parent provider fall back to their original hardcoded defaults
- Tag aliases are new exports — no import conflicts

---

## Standard Design Tokens (5 core)

| Token | Type | Propagates | Values |
|---|---|---|---|
| `size` | structural | yes | `xs` `sm` `default` `lg` `xl` |
| `density` | structural | yes | `compact` `default` `relaxed` |
| `radius` | structural | yes | `none` `sm` `default` `md` `lg` `xl` `full` |
| `intent` | semantic | yes | `default` `primary` `success` `warning` `danger` `info` |
| `variant` | visual | per-component | component-specific values |

---

## BACKLOG Items for Future

- [ ] Migrate remaining deprecated tokens (textSize, fancyPulseSize, spacing, cardVariant, headingVariant, actionButtonVariant, bgColor, alignment) in their respective components
- [ ] Add DesignTokenProvider to remaining organisms without tokens (Carousel, PasswordInput, Form wrapper)
- [ ] Unify `size` scale — standardize `xs|sm|default|lg|xl` across all components (currently Dialog uses `sm|md|lg|xl|full`, Button uses `default|sm|lg|icon`)
- [ ] Theme presets (#82) — declarative per-app defaults (dashboard=compact, landing=relaxed)
- [ ] Inspector: show `deprecatedBy` visually (strikethrough + suggestion badge)
