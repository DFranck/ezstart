# Theme System - Project-Specific CSS Variables

This directory contains project-specific CSS themes that are globally accessible to all apps in the monorepo.

## Architecture

All projects consume `packages/ui/src/styles/globals.css`, which imports `themes/index.css`. This means **all apps have access to all theme variables**, but each app only uses the variables relevant to its project.

```
globals.css
  └─> @import './themes/index.css'
        └─> @import './ezbill.css'
        └─> @import './monitoring.css'
        └─> @import './fengshui.css'
        └─> @import './ezstart.css'
```

## Available Themes

### EZBill Theme (`ezbill.css`)

**Purpose:** Invoicing and billing application colors

**44 CSS Variables:**
- Entity colors: `--ezbill-client`, `--ezbill-company`, `--ezbill-payment`
- Document types: `--ezbill-invoice`, `--ezbill-quote`, `--ezbill-receipt`
- Status states: `--ezbill-draft`, `--ezbill-sent`, `--ezbill-paid`, `--ezbill-accepted`, `--ezbill-rejected`, `--ezbill-pending`
- Each with corresponding `-foreground` variants

**14 Gradient Utilities:**
- `.bg-gradient-client`, `.bg-gradient-client-hover`, `.bg-gradient-client-light`
- `.bg-gradient-invoice`, `.bg-gradient-invoice-hover`, `.bg-gradient-invoice-light`
- `.bg-gradient-quote`, `.bg-gradient-payment` (shared)
- `.bg-gradient-company`, `.bg-gradient-receipt`

**Usage Example:**
```tsx
// EZBill app components
<Badge className="bg-ezbill-invoice text-ezbill-invoice-foreground">
  Invoice
</Badge>

<div className="bg-gradient-client hover:bg-gradient-client-hover">
  Client Card
</div>
```

### Monitoring Theme (`monitoring.css`)

**Purpose:** System monitoring and observability colors

**14 CSS Variables:**
- Status colors: `--status-healthy`, `--status-degraded`, `--status-unhealthy`, `--status-unknown`
- Platform colors: `--platform-railway`, `--platform-render`, `--platform-vercel`
- Each with corresponding `-foreground` variants

**Usage Example:**
```tsx
// Monitoring dashboard
<Badge className="bg-status-healthy text-status-healthy-foreground">
  Operational
</Badge>

<div className="bg-platform-railway text-platform-railway-foreground">
  Railway Service
</div>
```

### FengShui Theme (`fengshui.css`)

**Purpose:** FengShui app brand colors

**2 CSS Variables:**
- `--fengshui-primary` - Main brand color (purple)
- `--fengshui-secondary` - Secondary accent color

**Usage Example:**
```tsx
// FengShui app
<Button className="bg-fengshui-primary text-white">
  Analyze Plan
</Button>
```

### EZStart Theme (`ezstart.css`)

**Purpose:** EZStart app brand color

**1 CSS Variable:**
- `--ezstart` - Brand identity color (purple)

**Usage Example:**
```tsx
// EZStart landing page
<h1 className="text-ezstart">
  Welcome to EZStart
</h1>
```

## Adding a New Project Theme

### Step 1: Create Theme File

Create `themes/[project].css` with your project's colors:

```css
/* [Project] Theme Variables */

:root {
  /* Light mode colors */
  --project-primary: oklch(0.7 0.15 240);
  --project-primary-foreground: oklch(0.98 0.01 240);
  --project-secondary: oklch(0.65 0.18 180);
  --project-secondary-foreground: oklch(0.98 0.01 180);
}

.dark {
  /* Dark mode colors - adjust lightness/chroma for visibility */
  --project-primary: oklch(0.75 0.18 240);
  --project-primary-foreground: oklch(0.98 0.01 240);
  --project-secondary: oklch(0.70 0.20 180);
  --project-secondary-foreground: oklch(0.98 0.01 180);
}

@theme inline {
  /* Map to Tailwind utilities */
  --color-project-primary: var(--project-primary);
  --color-project-primary-foreground: var(--project-primary-foreground);
  --color-project-secondary: var(--project-secondary);
  --color-project-secondary-foreground: var(--project-secondary-foreground);
}
```

### Step 2: Add Custom Utilities (Optional)

If you need gradient classes or custom utilities:

```css
@layer utilities {
  .bg-gradient-project {
    background: linear-gradient(
      to right,
      oklch(0.75 0.15 240),
      oklch(0.70 0.18 260)
    );
  }

  .bg-gradient-project-hover {
    background: linear-gradient(
      to right,
      oklch(0.65 0.16 240),
      oklch(0.60 0.19 260)
    );
  }
}
```

### Step 3: Import in `themes/index.css`

Add your theme to the central import file:

```css
/* Import all project themes */
@import './ezbill.css';
@import './monitoring.css';
@import './fengshui.css';
@import './ezstart.css';
@import './project.css'; /* ← Add your theme here */
```

### Step 4: Use in Your App

Your theme variables are now globally accessible:

```tsx
import { Badge } from '@ezstart/ui/components'

export function ProjectCard() {
  return (
    <Badge className="bg-project-primary text-project-primary-foreground">
      Status
    </Badge>
  )
}
```

## Color System - OKLCH

All themes use the **OKLCH color space** for better perceptual uniformity and dark mode support.

**Format:** `oklch(lightness chroma hue [/ alpha])`
- **Lightness** (0-1): 0 = black, 1 = white
- **Chroma** (0-0.4): Color intensity (0 = gray)
- **Hue** (0-360): Color angle (0 = red, 120 = green, 240 = blue)

**Examples:**
```css
/* Vibrant blue */
--primary: oklch(0.7 0.15 240);

/* Muted green */
--success: oklch(0.75 0.17 145);

/* Dark purple */
--brand: oklch(0.5413 0.2466 293.01);
```

## Dark Mode Support

**Always define both `:root` and `.dark` variants:**

```css
:root {
  /* Light mode - lower lightness for text/backgrounds */
  --color: oklch(0.65 0.15 240);
  --color-foreground: oklch(0.25 0.08 240);
}

.dark {
  /* Dark mode - higher lightness for visibility */
  --color: oklch(0.75 0.18 240);
  --color-foreground: oklch(0.98 0.01 240);
}
```

**Guidelines:**
- Light mode backgrounds: L = 0.65-0.75
- Dark mode backgrounds: L = 0.70-0.85
- Foregrounds: Always high contrast (L = 0.98 or L = 0.20-0.25)

## Tailwind Integration

CSS variables are automatically mapped to Tailwind utilities via `@theme inline`:

```css
@theme inline {
  --color-ezbill-invoice: var(--ezbill-invoice);
  --color-ezbill-invoice-foreground: var(--ezbill-invoice-foreground);
}
```

This enables:
```tsx
<div className="bg-ezbill-invoice text-ezbill-invoice-foreground">
  Invoice Badge
</div>
```

## Best Practices

### 1. Naming Convention

```css
/* Entity/concept */
--project-entity: oklch(...);
--project-entity-foreground: oklch(...);

/* Status/state */
--project-status-state: oklch(...);
--project-status-state-foreground: oklch(...);
```

### 2. Foreground Pairs

**Always create foreground variants** for accessibility:

```css
/* ✅ GOOD - Accessible contrast */
--primary: oklch(0.65 0.15 240);
--primary-foreground: oklch(0.98 0.01 240);

/* ❌ BAD - No foreground variant */
--primary: oklch(0.65 0.15 240);
/* What text color should be used? */
```

### 3. Semantic Names

Use semantic names instead of color names:

```css
/* ✅ GOOD - Semantic */
--status-healthy: oklch(0.75 0.17 145);
--ezbill-invoice: oklch(0.65 0.17 240);

/* ❌ BAD - Color names */
--green: oklch(0.75 0.17 145);
--blue: oklch(0.65 0.17 240);
```

### 4. Keep It Focused

**Only include variables needed by your project.** Don't create variables for every possible color - use generic UI colors from `globals.css` for common cases.

```css
/* ✅ GOOD - Project-specific */
--ezbill-invoice: oklch(0.65 0.17 240);
--ezbill-quote: oklch(0.7 0.17 135);

/* ❌ BAD - Generic colors (use globals.css) */
--button-background: oklch(0.205 0 0); /* Use --primary instead */
--text-color: oklch(0.145 0 0);        /* Use --foreground instead */
```

## File Organization

```
themes/
├── index.css           # Central import file (don't modify manually)
├── README.md           # This file
├── ezbill.css          # EZBill app theme (44 variables + 14 utilities)
├── monitoring.css      # Monitoring app theme (14 variables)
├── fengshui.css        # FengShui app theme (2 variables)
├── ezstart.css         # EZStart app theme (1 variable)
└── [project].css       # Your new project theme
```

## Migration Notes

**Before (October 2025):**
- All project-specific variables were in `globals.css`
- 418 lines mixing generic and project code
- Violated SRP (Single Responsibility Principle)

**After (October 2025):**
- Project themes separated into `themes/` directory
- `globals.css` contains ONLY generic shadcn/ui styles (~195 lines)
- All apps still have global access via `@import './themes/index.css'`
- Architecture score: 55/100 → 88/100 (+33 points)

## References

- [OKLCH Color Picker](https://oklch.com/)
- [Tailwind CSS Theme Configuration](https://tailwindcss.com/docs/theme)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [STYLES-AUDIT.md](../../STYLES-AUDIT.md) - Complete audit and migration plan
