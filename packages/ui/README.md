# @ezstart/ui

Accessible React UI component library built on shadcn + Radix, with semantic color tokens, dark mode, and 90+ components organized by atomic level.

## Install

```bash
npm install @ezstart/ui
# Peer deps (auto-resolved in workspaces, install manually for standalone use):
npm install react react-dom tailwindcss
```

Wire the design tokens in your global CSS:

```css
/* app/globals.css */
@import '@ezstart/ui/globals.css';
```

And the PostCSS config:

```js
// postcss.config.mjs
import config from '@ezstart/ui/postcss.config'
export default config
```

## Quickstart — Theme + first component

Wrap your app in `<ThemeProvider>` and use semantic components instead of native HTML.

```tsx
// app/layout.tsx
import { ThemeProvider } from '@ezstart/ui/theme'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
```

```tsx
// app/page.tsx
import { Card, CardHeader, CardContent, H1, P, Button, Input } from '@ezstart/ui/components'

export default function Page() {
  return (
    <Card variant="floating">
      <CardHeader>
        <H1 size="h2">Welcome</H1>
        <P>Sign in to continue.</P>
      </CardHeader>
      <CardContent>
        <Input placeholder="Email" />
        <Button>Continue</Button>
      </CardContent>
    </Card>
  )
}
```

### Design tokens

Always use semantic color classes (`bg-primary`, `text-foreground`, `text-destructive`) rather than hardcoded colors (`bg-blue-500`, `text-red-600`). Semantic tokens auto-switch between light and dark mode.

| Context     | Classes                                                            |
| ----------- | ------------------------------------------------------------------ |
| Background  | `bg-background`, `bg-card`, `bg-muted`, `bg-popover`, `bg-accent`  |
| Text        | `text-foreground`, `text-muted-foreground`, `text-card-foreground` |
| Primary     | `bg-primary`, `text-primary`, `text-primary-foreground`            |
| Destructive | `bg-destructive`, `text-destructive`                               |
| Border      | `border` (auto), `border-input`, `border-ring`                     |
| Status      | `bg-success`, `bg-warning`, `bg-error`, `bg-info`                  |

## Components overview

Components are organized into **3 atomic levels** (base → composed → complex) and **feature folders** (forms, layout, data-display, etc.). All components accept variants via `class-variance-authority`.

### Base (46 components)

Primitives with no UI component dependencies. They **apply** design tokens (CSS padding, gap, font-size).

| Category   | Components                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Forms      | `Input`, `Label`, `Select`, `Switch`, `Textarea`                                                 |
| Feedback   | `Progress`, `Skeleton`, `Spinner`, `Tooltip`, `Sonner`                                           |
| Data       | `Badge`, `Card`, `Table`, `SimpleBadge`                                                          |
| Overlay    | `Dialog`, `Modal`, `Sheet`                                                                       |
| Navigation | `Tabs`                                                                                           |
| Media      | `Chart`, `ImageCropper`, `Img`, `UptimeGraph`                                                    |
| Effects    | `AnimatedCounter`, `AuroraBackground`, `InfiniteMovingCards`, `TextGradient`, `TypewriterEffect` |
| Tag        | `Div`, `P`, `H1`-`H6`, `Section`, `Main`, `Span`, `Label`                                        |
| Other      | `Button`, `AnimatedIconToggle`, `Icon`, `SkipLink`                                               |

### Composed (33 components)

Components using 1-3 other UI components. They **merge and drill** design tokens to base children.

| Category   | Components                                                                    |
| ---------- | ----------------------------------------------------------------------------- |
| Forms      | `Checkbox`, `PasswordInput`, `Form`, `PasswordStrength`                       |
| Data       | `Accordion`, `DataTable`                                                      |
| Layout     | `Footer`, `Header`, `MobileNavbar`, `SplitSection`                            |
| Navigation | `BackButton`, `Command`, `Dropdown`                                           |
| Overlay    | `FloatingPanel`, `WelcomeModal`, `AlertDialog`                                |
| Feedback   | `ErrorAlert`                                                                  |
| Utility    | `LocaleSwitcher`, `PWAInstallPrompt`, `VersionSwitch`, `ScopeContextSwitcher` |

### Complex (10 components)

Components using 4+ other UI components. They **orchestrate and drill** design tokens through the entire tree.

| Category   | Components                               |
| ---------- | ---------------------------------------- |
| Layout     | `ClientLayout`, `LayoutWithAside`        |
| Thread     | `ThreadLayout`, `ThreadSidebar`          |
| Landing    | `FeatureGrid`, `LandingHero`, `UseCases` |
| Navigation | `Stepper`                                |
| Theme      | `ThemeEditor`                            |
| Utility    | `ErrorBoundary`                          |

## API

### Core entry points

```ts
import { Button, Card, Input } from '@ezstart/ui/components'
import { useMediaQuery } from '@ezstart/ui/hooks'
import { cn } from '@ezstart/ui/lib'
import { ThemeProvider, useTheme } from '@ezstart/ui/theme'
```

| Entry point                | Content                                           |
| -------------------------- | ------------------------------------------------- |
| `@ezstart/ui/components`   | All 90+ components                                |
| `@ezstart/ui/hooks`        | React hooks (`useMediaQuery`, `useDebounce`, ...) |
| `@ezstart/ui/lib`          | Utilities (`cn`, color helpers)                   |
| `@ezstart/ui/theme`        | `<ThemeProvider>`, `useTheme`, `ThemeSwitcher`    |
| `@ezstart/ui/theme/server` | Server-only theme helpers (`resolveSsrTheme`)     |
| `@ezstart/ui/templates`    | Page templates                                    |
| `@ezstart/ui/styles`       | Style tokens                                      |
| `@ezstart/ui/utils`        | Utilities                                         |

### Token propagation

Pass `density="compact"` (or `size`, `variant`) at the top of a tree and it drills down through composed and complex components to the base layer where the actual CSS effect is applied.

```tsx
<ClientLayout density="compact">
  {/* DataTable inside automatically renders compact rows */}
  <DataTable data={...} columns={...} />
</ClientLayout>
```

### Customization

- **Variants** — most components accept `variant`, `size`, `density` props powered by `class-variance-authority`.
- **Theme tokens** — override CSS variables in your global CSS to change brand colors, radius, spacing.
- **`className` override** — every component accepts `className` for one-off Tailwind tweaks (merged via `tailwind-merge`).

```tsx
<Button variant="destructive" size="sm" className="w-full" />
<Card variant="floating">...</Card>
<H2 size="h3">...</H2> {/* renders an h2 with h3 styles */}
```

## Adding new components

```bash
pnpm --filter @ezstart/ui ui:add <component-name>
```

Then export from the appropriate level barrel (`src/components/base/index.ts`, `composed/index.ts`, or `complex/index.ts`).

## Landing primitives

Drop-in abstractions for marketing pages: `<LandingHero>`, `<FeatureGrid>`, `<HowItWorksSteps>`, `<CodeBlock>`, `<CTA>`, `<LandingSection>`. Each is data-driven (props in, layout out).

```tsx
import { LandingHero, FeatureGrid, CTA } from '@ezstart/ui/components'

<LandingHero
  variant="withGradient"
  align="center"
  badge="Authentication as a Service"
  title="Authentication for every app"
  description="One SDK. Any framework. Zero config."
  primaryCTA="Get Started Free"
  primaryCTAHref="/register"
/>

<FeatureGrid features={features} columns={3} />

<CTA
  variant="centered"
  intent="primary"
  title="Ready to get started?"
  primaryText="Start Free"
  primaryHref="/register"
/>
```

## Related

- [`@ezstart/auth-sdk`](../auth-sdk) — Auth components built on top of this UI library.
- [`@ezstart/pay-sdk`](../pay-sdk) — Payment components built on top of this UI library.
- [`@ezstart/api-sdk`](../api-sdk) — HTTP client used by SDK components.
