# Design System — @ezstart/ui

Unified token architecture for all UI components. Single source of truth for spacing, sizing, colors, and variants across the monorepo.

## Architecture Overview

```
packages/ui/src/
├── lib/design-system/
│   ├── tokens.ts          # All design tokens (spacing, sizing, colors, layout)
│   ├── variants.ts        # CVA variant configs for shadcn components
│   └── index.ts           # Barrel export
├── components/
│   ├── tag/src/
│   │   ├── tokens/tokens.ts   # Re-exports from lib/design-system/tokens
│   │   └── variants/tags/     # Tag-specific CVA configs (div, section, header...)
│   ├── button.tsx             # Consumes buttonVariantConfig
│   ├── card.tsx               # Consumes cardVariantConfig
│   ├── input.tsx              # Consumes formInputVariantConfig
│   └── layout/               # Header, Footer, Main, ClientLayout
```

**Flow:** `tokens.ts` defines raw values. `variants.ts` composes them into CVA configs. Components consume either tokens directly or CVA configs.

Tag tokens (`tag/src/tokens/tokens.ts`) re-export from `lib/design-system/tokens` for backward compatibility. No duplication — one source.

## The 4 Universal Variant Axes

Every component in the system can be described by up to 4 axes. The same axis name produces context-appropriate output depending on whether the target is a container or text element.

| Axis | Purpose | Container interpretation | Text interpretation |
|------|---------|------------------------|-------------------|
| `size` | Scale | `max-w`, `padding`, `gap` | `font-size`, `line-height` |
| `intent` | Semantic status | `bg` + `border` color | `text` color |
| `variant` | Visual style | `bg` + `shadow` + `border` | `text-decoration`, `font-style` |
| `density` / `layout` | Spacing & arrangement | `gap`, `padding`, flex/grid | `text-align`, `line-height` |

**Example — `intent: "success"` applied to different contexts:**

```typescript
// Container (Card, Alert, Section)
intentContainer.success
// → 'border border-success bg-success/20 text-success-foreground'

// Text (P, Label, Span)
intentText.success
// → 'text-success'
```

**Example — `size: "sm"` applied to different contexts:**

```typescript
// Form input: height + padding + font
formInputVariantConfig.size.sm
// → 'h-10 sm:h-8 px-3 sm:px-2 text-sm sm:text-xs'

// Card: gap + padding
cardVariantConfig.size.sm
// → 'gap-2 sm:gap-1 py-2 sm:py-1'

// Container (Section): max-width + padding
sizeContainer.sm
// → 'w-full max-w-3xl gap-1 md:gap-2'
```

## Token Reference

All tokens are mobile-first responsive. Format: `mobile → desktop` via `sm:` breakpoint (640px).

### touchHeight — Interactive element heights (WCAG 44px min)

| Key | Classes | Mobile | Desktop |
|-----|---------|--------|---------|
| `sm` | `h-10 sm:h-8` | 40px | 32px |
| `default` | `h-11 sm:h-9` | 44px | 36px |
| `lg` | `h-12 sm:h-10` | 48px | 40px |
| `xl` | `h-14 sm:h-12` | 56px | 48px |

### touchSize — Square interactive elements (icon buttons)

| Key | Classes | Mobile | Desktop |
|-----|---------|--------|---------|
| `sm` | `size-10 sm:size-8` | 40px | 32px |
| `default` | `size-11 sm:size-9` | 44px | 36px |
| `lg` | `size-12 sm:size-10` | 48px | 40px |

### padding / paddingX / paddingY

| Key | paddingX | paddingY |
|-----|----------|----------|
| `xs` | `px-2 sm:px-1` | `py-1 sm:py-0.5` |
| `sm` | `px-3 sm:px-2` | `py-2 sm:py-1` |
| `default` | `px-4 sm:px-3` | `py-2 sm:py-2` |
| `md` | `px-4 sm:px-4` | `py-3 sm:py-2` |
| `lg` | `px-4 sm:px-6` | `py-4 sm:py-3` |
| `xl` | `px-6 sm:px-8` | `py-6 sm:py-4` |

`padding` combines both axes: `padding.lg` = `paddingX.lg` + `paddingY.lg`.

### gap — Spacing between children

| Key | Classes | Mobile | Desktop |
|-----|---------|--------|---------|
| `xs` | `gap-1 sm:gap-0.5` | 4px | 2px |
| `tight` | `gap-1.5 sm:gap-1` | 6px | 4px |
| `sm` | `gap-2 sm:gap-1` | 8px | 4px |
| `default` | `gap-2 sm:gap-2` | 8px | 8px |
| `normal` | `gap-3 sm:gap-2` | 12px | 8px |
| `relaxed` | `gap-4 sm:gap-3` | 16px | 12px |
| `spacious` | `gap-6 sm:gap-4` | 24px | 16px |
| `loose` | `gap-8 sm:gap-6` | 32px | 24px |

### fontSize — Typography

| Key | Classes | Notes |
|-----|---------|-------|
| `xs` | `text-xs sm:text-[10px]` | Labels, captions |
| `sm` | `text-sm sm:text-xs` | Secondary text |
| `base` | `text-base sm:text-sm` | Body text, inputs (16px avoids iOS zoom) |
| `lg` | `text-lg sm:text-base` | Emphasized |
| `xl` | `text-xl sm:text-lg` | Subheadings |
| `h6`–`h1` | Responsive 3-step scale | `text-sm` to `text-5xl` via `sm:` and `md:` |
| `giant` | `text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl` | Hero displays |

### radius

| Key | Class | Use case |
|-----|-------|----------|
| `none` | `rounded-none` | — |
| `sm` | `rounded-sm` | Small elements |
| `default` / `md` | `rounded-md` | Input, button, select |
| `lg` | `rounded-lg` | Dialog |
| `xl` | `rounded-xl` | Card |
| `full` | `rounded-full` | Badge, avatar |

### shadow

| Key | Class | Use case |
|-----|-------|----------|
| `none` | `shadow-none` | — |
| `xs` | `shadow-xs` | Button, input |
| `sm` | `shadow-sm` | Card, badge |
| `default` | `shadow` | Standard |
| `md`–`2xl` | `shadow-md` to `shadow-2xl` | Dialog, elevated cards |

### intentContainer / intentText — Semantic colors

| Key | Container output | Text output |
|-----|-----------------|-------------|
| `default` | (none) | (none) |
| `primary` | `bg-primary text-primary-foreground shadow-sm` | `text-primary` |
| `success` | `border border-success bg-success/20 text-success-foreground` | `text-success` |
| `warning` | `border border-warning bg-warning/20 text-warning-foreground` | `text-warning` |
| `destructive` | `border border-destructive bg-destructive/20 text-destructive-foreground` | `text-destructive` |
| `info` | `border border-info bg-info/50 text-info-foreground` | `text-info` |
| `skeleton` | `skeleton-shimmer opacity-50 bg-muted...` | — |
| `disabled` | `bg-muted text-muted-foreground opacity-50 pointer-events-none` | `text-muted opacity-50 pointer-events-none` |

### variantContainer / variantText — Visual styles

| Key | Container output | Text output |
|-----|-----------------|-------------|
| `default` | (none) | (none) |
| `primary` | `bg-primary text-primary-foreground shadow-sm` | — |
| `outline` | `border shadow-sm rounded` | — |
| `filled` | `bg-muted` | — |
| `ghost` | (none) | — |
| `card` | `bg-card border shadow-sm text-card-foreground rounded` | — |
| `floating` | `bg-card border shadow-lg rounded` | — |
| `link` | — | `text-cyan-600 hover:underline cursor-pointer` |
| `description` | — | `italic text-muted-foreground font-light` |
| `muted` | — | `text-muted-foreground` |

### layoutContainer / layoutText — Arrangement

| Key | Container | Text |
|-----|-----------|------|
| `inline` | `flex flex-row flex-wrap items-center` | `flex flex-row items-center` |
| `block` | `flex` | — |
| `col` | `flex flex-col` | — |
| `row` | `flex flex-row` | — |
| `grid` | Responsive `grid-cols-1` to `grid-cols-6` | — |
| `center` | `flex flex-col items-center justify-center` | `text-center` |
| `left` / `right` | — | `text-left` / `text-right` |

### align

| Key | Classes |
|-----|---------|
| `center` | `items-center justify-center text-center` |
| `left` | `items-start justify-start text-left` |
| `right` | `items-end justify-end text-right` |
| `between` | `items-center justify-between` |
| `around` | `items-center justify-around` |
| `evenly` | `items-center justify-evenly` |

### sizeContainer — Section/page widths

| Key | max-width | gap |
|-----|-----------|-----|
| `xs` | `max-w-2xl` | `gap-1 md:gap-2` |
| `sm` | `max-w-3xl` | `gap-1 md:gap-2` |
| `md` | `max-w-4xl` | `gap-2 md:gap-4` |
| `lg` | `max-w-5xl` | `gap-2 md:gap-4` |
| `xl` | `max-w-6xl` | `gap-4 md:gap-6` |
| `2xl` | `max-w-7xl` | `gap-4 md:gap-6` |
| `full` | `max-w-none` | `gap-4 md:gap-8` |

## Component Integration

### Tag components (Div, Section, Header...)

Tags use CVA with their own variant configs that reference design-system tokens. Each tag defines context-specific `size` and `layout` values while sharing `intent` and `variant` from the centralized tokens.

```typescript
// tag/src/variants/tags/div.ts
import { intentContainer, variantContainer } from '../../tokens/tokens'

export const divVariantConfig = {
  variant: variantContainer,     // Shared from design-system
  intent: intentContainer,       // Shared from design-system
  size: divSize,                 // Div-specific (padding values)
  layout: divLayout,             // Div-specific (flex/grid configs)
}
```

Usage:

```tsx
import { Div, Section } from '@ezstart/ui/components'

<Div variant="card" intent="success" size="md" layout="col">
  <Section size="lg" layout="center" intent="info">
    Content
  </Section>
</Div>
```

### shadcn components (Button, Card, Input...)

These use CVA variant configs from `variants.ts` which compose raw tokens.

```typescript
// variants.ts
export const formInputVariantConfig = {
  size: {
    sm: [touchHeight.sm, paddingX.sm, fontSize.sm].join(' '),
    default: [touchHeight.default, paddingX.default, fontSize.base].join(' '),
    lg: [touchHeight.lg, paddingX.lg, fontSize.lg].join(' '),
  },
  variant: { default: variantContainer.outline, filled: variantContainer.filled, ghost: variantContainer.ghost },
  intent: { default: '...', destructive: '...', success: '...' },
}
```

Usage in component:

```tsx
import { createFormInputVariant } from '@ezstart/ui/lib/design-system'

const inputVariants = createFormInputVariant(
  'flex w-full rounded-md border bg-transparent transition-colors'
)

export const Input = ({ size, variant, intent, className, ...props }) => (
  <input className={cn(inputVariants({ size, variant, intent }), className)} {...props} />
)
```

### Layout components (ClientLayout, Header, Footer)

Layout components consume tag variant configs (e.g., `headerVariantConfig`) and compose them with additional props like `position`.

```tsx
// ClientLayout uses Header which uses headerVariantConfig
<Header position="fixed" leftContent={logo} centerContent={nav} rightContent={actions} />
```

## How to Add a New Variant Value

**Example: adding `intent: "neutral"` to all components.**

1. Add the token in `lib/design-system/tokens.ts`:

```typescript
export const intentContainer = {
  // ...existing
  neutral: 'border border-border bg-muted/50 text-foreground',
} as const

export const intentText = {
  // ...existing
  neutral: 'text-muted-foreground',
} as const
```

2. Since `variants.ts` references `intentContainer` by spread, configs like `cardVariantConfig.intent` pick it up automatically. For configs that list intents explicitly (like `formInputVariantConfig.intent`), add the new key there too:

```typescript
export const formInputVariantConfig = {
  intent: {
    // ...existing
    neutral: 'border-border focus-visible:ring-border focus-visible:ring-[3px] sm:focus-visible:ring-[2px]',
  },
}
```

3. Tag variants that import `intentContainer` from the tokens barrel get the new value automatically.

4. Rebuild the package: `pnpm --filter @ezstart/ui build`

## How to Create a New Component

1. **Check `@ezstart/ui/components` first** — it may already exist.

2. **Pick the right CVA config** from `variants.ts` or compose from tokens:

```typescript
import { cva } from 'class-variance-authority'
import { touchHeight, paddingX, fontSize, radius, variantContainer } from '@ezstart/ui/lib/design-system'

const myComponentVariants = cva('inline-flex items-center transition-colors', {
  variants: {
    size: {
      sm: [touchHeight.sm, paddingX.sm, fontSize.sm].join(' '),
      default: [touchHeight.default, paddingX.default, fontSize.base].join(' '),
    },
    variant: {
      default: variantContainer.outline,
      filled: variantContainer.filled,
    },
  },
  defaultVariants: { size: 'default', variant: 'default' },
})
```

3. **Export the component** from the package barrel. Follow the existing pattern in `components/`.

4. **Use semantic color classes only** (`bg-primary`, `text-muted-foreground`) — never hardcoded colors (`bg-gray-100`).

5. **Use `touchHeight`** for any interactive element to ensure WCAG 44px minimum on mobile.

## Migration Status

### Migrated (17 components)

| Priority | Component | Key tokens used |
|----------|-----------|----------------|
| P0 | Input | `touchHeight.default`, `fontSize.base`, `paddingX.default` |
| P0 | Checkbox | `touchSmall.checkbox` |
| P0 | TextArea | `fontSize.base`, responsive heights |
| P1 | Select | `touchHeight.default` |
| P1 | Card | `paddingX.lg`, `paddingY.lg`, `gap.relaxed` |
| P1 | Dialog | `padding.lg`, responsive content |
| P1 | AlertDialog | `padding.lg`, responsive content |
| P1 | Badge | `fontSize.xs`, responsive sizes |
| P1 | Label | `fontSize.base` |
| P1 | Accordion | `paddingX.default`, `gap.default` |
| P1 | Tabs | `touchHeight.default` |
| P1 | Modal | `responsive.modalWidth` |
| P2 | Table | Responsive font/padding all sizes |
| P2 | Skeleton | Responsive padding (SkeletonCard variants) |
| P2 | Tooltip | Already optimal |
| P2 | Button | Foundation (`h-11 sm:h-9`) |
| P2 | Tag | Original inspiration component |

### Remaining (8 components)

- **Form:** Switch, RadioGroup, Slider
- **Overlay:** Popover, DropdownMenu
- **Feedback:** Toast, Alert
- **Utility:** Avatar, Separator, Progress

## Quick Reference — Common Patterns

```typescript
import { touchHeight, paddingX, paddingY, fontSize, gap, radius, variantContainer, responsive } from '@ezstart/ui/lib/design-system'

// Form input
cn(touchHeight.default, paddingX.default, fontSize.base, radius.default)

// Card body
cn(variantContainer.card, paddingX.lg, paddingY.lg, gap.relaxed)

// Dialog content
cn(responsive.dialogPadding, gap.relaxed)

// Icon button
cn(touchSize.default, radius.default)

// Section with max-width
cn(sizeContainer.md, layoutContainer.col)
```
