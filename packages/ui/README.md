# @ezstart/ui

Accessible UI component library built on shadcn/Radix for all @ezstart web apps.

## Purpose

Single source of truth for all UI components, ensuring consistent design, dark mode support, and accessibility across every web app. All user-facing HTML must use these components instead of native elements.

## Tech Stack

- React, Tailwind CSS (OKLCH semantic colors), Radix UI primitives
- shadcn/ui base, customized with variants

## Architecture

### Feature Folders (where to find components)

```
ui/src/components/
├── layout/        # Card, Main, Header, Footer, Sidebar
├── forms/         # Input, Select, Checkbox, Switch, DatePicker
├── navigation/    # Tabs, Breadcrumb, Pagination, Sidebar
├── data-display/  # DataTable (TanStack), Badge, Avatar
├── overlay/       # Dialog, Sheet, Popover, Tooltip, Drawer
├── feedback/      # Alert, Skeleton, Progress, Spinner
├── tag/           # H1-H6, P, Label, Text (semantic HTML wrappers)
├── thread/        # Chat thread components
├── media/         # Image, video components
├── landing/       # Landing page sections
└── theme-selector # Theme toggle
```

### Atomic Levels (how design tokens flow)

Components are classified into 3 levels based on their dependency hierarchy. This determines how design tokens (`density`, `size`, `variant`) propagate:

```
Complex  →  reçoit le token, orchestre et drill à tous les enfants
Composed →  reçoit le token, merge et drill aux enfants base
Base     →  reçoit le token, APPLIQUE l'effet CSS réel
```

#### Base (46 components) — `@ezstart/ui/components/base`

Primitives with **no UI component dependencies**. These are the components that **apply** design tokens (CSS padding, gap, font-size, etc.).

| Category         | Components                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| **Forms**        | `Input`, `Label`, `Select`, `Switch`, `Textarea`                                                 |
| **Feedback**     | `Progress`, `Skeleton`, `Spinner`, `Tooltip`, `Sonner`                                           |
| **Data Display** | `Badge`, `Card`, `Table`, `SimpleBadge`                                                          |
| **Overlay**      | `Dialog`, `Modal`, `Sheet`                                                                       |
| **Navigation**   | `Tabs`                                                                                           |
| **Media**        | `Chart`, `ImageCropper`, `Img`, `UptimeGraph`                                                    |
| **Effects**      | `AnimatedCounter`, `AuroraBackground`, `InfiniteMovingCards`, `TextGradient`, `TypewriterEffect` |
| **Tag**          | `Div`, `P`, `H1`-`H6`, `Section`, `Main`, `Span`, `Label` (semantic HTML wrappers)               |
| **Thread**       | `Thread`, `ThreadHeader`, `ThreadWelcome`                                                        |
| **Other**        | `Button`, `AnimatedIconToggle`, `Icon`, `SkipLink`                                               |

**When adding a design token:** Add the CSS implementation here. Example: `density="compact"` on `Button` reduces padding from `p-3` to `p-1.5`.

#### Composed (33 components) — `@ezstart/ui/components/composed`

Components using **1-3 other UI components**. These **merge and drill** design tokens to their base children.

| Category         | Components                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Forms**        | `Checkbox` (Label+Span), `PasswordInput` (Input+Button), `Form` (Label)                                                             |
| **Data Display** | `Accordion` (Icon), `DataTable` (Table+Button+Input)                                                                                |
| **Layout**       | `Footer`, `Header`, `MobileNavbar`, `SplitSection`                                                                                  |
| **Thread**       | `ThreadComposer` (Button), `ThreadMessage` (Icon), `ThreadMessages`, `ThreadSidebarToggle` (Button+Icon), `ConversationItem` (Icon) |
| **Navigation**   | `BackButton`, `Command`, `Dropdown`                                                                                                 |
| **Overlay**      | `FloatingPanel`, `WelcomeModal`, `AlertDialog`                                                                                      |
| **Utility**      | `LocaleSwitcher`, `PWAInstallPrompt`, `VersionSwitch`                                                                               |

**When adding a design token:** Accept the prop, merge it with local defaults, then pass it down to base children. Example:

```tsx
// Composed: PasswordInput receives density and drills to Input + Button
function PasswordInput({ density, ...props }) {
  return (
    <>
      <Input density={density} {...props} />
      <Button density={density} size="icon" />
    </>
  )
}
```

#### Complex (10 components) — `@ezstart/ui/components/complex`

Components using **4+ other UI components**. These **orchestrate and drill** design tokens through the entire tree.

| Category       | Components                                        |
| -------------- | ------------------------------------------------- |
| **Layout**     | `ClientLayout` (8+ deps), `LayoutWithAside`       |
| **Thread**     | `ThreadLayout` (4 deps), `ThreadSidebar` (4 deps) |
| **Landing**    | `FeatureGrid`, `LandingHero`, `UseCases`          |
| **Navigation** | `Stepper`                                         |
| **Theme**      | `ThemeEditor` (9+ deps)                           |
| **Utility**    | `ErrorBoundary`                                   |

**When adding a design token:** Accept the prop at the top level and drill it down through every child layer. Example:

```tsx
// Complex: ThreadLayout drills density through the entire tree
function ThreadLayout({ density, children }) {
  return (
    <ThreadSidebar density={density}>
      {' '}
      {/* → composed → base */}
      <ThreadComposer density={density}>
        {' '}
        {/* → composed → base */}
        <ThreadMessages density={density}>
          {' '}
          {/* → composed → base */}
          {children}
        </ThreadMessages>
      </ThreadComposer>
    </ThreadSidebar>
  )
}
```

### Token Propagation Flow

```
<AILayout density="compact">                    ← SDK component
  └→ <ThreadLayout density="compact">           ← complex: drill
      ├→ <ThreadSidebar density="compact">       ← complex: drill
      │   └→ <ConversationItem density="compact"> ← composed: drill
      │       └→ <Button density="compact">       ← base: APPLY CSS
      ├→ <ThreadComposer density="compact">      ← composed: drill
      │   └→ <Input density="compact">            ← base: APPLY CSS
      │   └→ <Button density="compact">           ← base: APPLY CSS
      └→ <ThreadMessages density="compact">      ← composed: drill
          └→ <ThreadMessage density="compact">    ← composed: drill
              └→ <Button density="compact">       ← base: APPLY CSS
```

## Usage

```typescript
// Standard — import everything from one place
import { Button, Card, Input, DataTable } from '@ezstart/ui/components'

// By level — optional, for clarity
import { Button, Input } from '@ezstart/ui/components/base'
import { DataTable } from '@ezstart/ui/components/composed'
import { ThreadLayout } from '@ezstart/ui/components/complex'

// Hooks & utilities
import { useMediaQuery } from '@ezstart/ui/hooks'
import { cn } from '@ezstart/ui/lib'
```

## Adding Components

```bash
pnpm --filter @ezstart/ui ui:add [component-name]
```

## Used By

All web apps and packages (auth-sdk, pay-sdk, ai-sdk, rbac, next-theme).
