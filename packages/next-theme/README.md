# @ezstart/next-theme

Next.js theme provider with hydration-safe implementation for dark/light mode management.

## Overview

This package provides a centralized theme management solution for all Next.js applications in the @ezstart monorepo. It wraps `next-themes` with additional features and ensures consistent theming across all apps.

## Features

- 🌓 **Dark/Light Mode** - Seamless theme switching
- 🎨 **System Preference Detection** - Auto-detects user's OS theme (default: 'system')
- ⚡ **Hydration Safe** - No flash of unstyled content (uses blocking script)
- 🔧 **Theme Toggle Component** - Ready-to-use UI component
- 🎯 **TypeScript Support** - Full type safety
- 📦 **Zero Config** - Works out of the box with sane defaults

## Installation

This package is already installed in the monorepo. Just add it to your app's dependencies:

```json
{
  "dependencies": {
    "@ezstart/next-theme": "workspace:*"
  }
}
```

## Usage

### 1. Wrap your app with ThemeProvider

```tsx
// app/layout.tsx
import { ThemeProvider } from '@ezstart/next-theme'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning> {/* ⚠️ NO className on html tag! */}
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**⚠️ IMPORTANT:**
- **DO NOT** add `className=""` to the `<html>` tag - this breaks the blocking script!
- **ALWAYS** add `suppressHydrationWarning` to prevent React warnings
- The `next-themes` blocking script runs BEFORE hydration to prevent flash

### 2. Use the theme toggle component

```tsx
import { ThemeToggle } from '@ezstart/next-theme/components'

export default function Header() {
  return (
    <header>
      <nav>
        {/* Your navigation */}
        <ThemeToggle />
      </nav>
    </header>
  )
}
```

### 3. Access theme programmatically

```tsx
'use client'

import { useTheme } from '@ezstart/next-theme'

export default function CustomComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  )
}
```

## API Reference

### ThemeProvider

Provider component that wraps your app.

**Props:**
- All props from `next-themes` ThemeProvider
- Default: `attribute="class"`, `defaultTheme="system"`, `enableSystem={true}`

### useTheme()

Hook to access and control the theme.

**Returns:**
```typescript
{
  theme: string | undefined
  setTheme: (theme: string) => void
  resolvedTheme: string | undefined
  themes: string[]
  systemTheme: 'light' | 'dark' | undefined
}
```

### ThemeToggle

Ready-to-use theme toggle button component.

**Features:**
- Sun/Moon icon toggle
- Smooth transitions
- Accessible (keyboard navigation)
- Styled with @ezstart/ui components

## Applications Using This Package

- ✅ **web-ezstart** - Main landing page
- ✅ **web-ezauth** - Authentication portal
- ✅ **web-ezbill** - Invoicing app
- ✅ **web-ezpay** - Payment dashboard
- ✅ **web-tower-defense** - Game interface
- ✅ **web-fengshui** - Wellness app
- ✅ **web-asc-tcd** - Educational portal
- ✅ **web-green-pulse** - Eco-tracking app

## Related Packages

- [@ezstart/ui](../ui) - UI components library (uses theme)
- [@ezstart/auth-sdk](../auth-sdk) - Authentication SDK
- [@ezstart/next-config](../next-config) - Next.js configuration

## Technical Details

- Built on top of `next-themes` (v0.4.6)
- Requires React 19+ and Next.js 15+
- Uses CSS class attribute for theme switching
- Fully typed with TypeScript
- Compiled to ES modules

## Example: Full Setup

```tsx
// app/layout.tsx
import { ThemeProvider } from '@ezstart/next-theme'
import { AuthProvider } from '@ezstart/auth-sdk'
import '@ezstart/ui/globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider appName="my-app">
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

## Theme Customization with ThemeSelector

### Overview

ThemeSelector allows users to customize theme colors in real-time with **zero CSS duplication**. CSS files are auto-generated from source CSS files and imported directly from `@ezstart/ui/styles`.

### Features

- ✅ **Zero duplication** - CSS is source of truth, TypeScript exports are auto-generated
- ✅ **Centralized** - One component works for all apps
- ✅ **Simple imports** - Import CSS strings directly from `@ezstart/ui/styles`
- ✅ **Auto-generation** - Run `pnpm generate:themes` to sync CSS → TS exports

### Setup

**1. Import CSS in Client Component (Providers):**

```tsx
'use client'

import { ThemeProvider } from '@ezstart/next-theme'
import { globalThemeCss, greenPulseThemeCss } from '@ezstart/ui/styles'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      defaultTheme="system"
      enableSystem
      themeSelector={{
        appName: 'green-pulse',
        globalCss: globalThemeCss,
        appCss: greenPulseThemeCss,
      }}
    >
      {children}
    </ThemeProvider>
  )
}
```

**2. Use in layout.tsx:**

```tsx
import { Providers } from '@/providers/providers'
import '@ezstart/ui/globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

**3. Use ThemeSelector component:**

```tsx
'use client'

import { ThemeSelector, ThemeSwitcher } from '@ezstart/next-theme/components'

export function Header() {
  return (
    <header>
      <ThemeSelector adminOnly={false} enableHistory={true} />
      <ThemeSwitcher />
    </header>
  )
}
```

### Available Theme CSS Exports

Import from `@ezstart/ui/styles`:

```typescript
import {
  globalThemeCss,      // Global :root and .dark variables
  greenPulseThemeCss,  // GreenPulse theme
  ezbillThemeCss,      // EZBill theme
  ezpayThemeCss,       // EZPay theme
  ezauthThemeCss,      // EZAuth theme
  ezstartThemeCss,     // EZStart theme
  fengshuiThemeCss,    // FengShui theme
  towerDefenseThemeCss,// Tower Defense theme
  ascTcdThemeCss,      // ASC-TCD theme
} from '@ezstart/ui/styles'
```

### Auto-Generation

CSS files are in `packages/ui/src/styles/themes/{app-name}/{app-name}.css`

To regenerate TypeScript exports after editing CSS:

```bash
pnpm --filter @ezstart/ui generate:themes
pnpm --filter @ezstart/ui build
```

### Architecture

**Single source of truth:**
```
packages/ui/src/styles/
├── globals.css                           ← Global variables (source)
├── globals.ts                            ← Auto-generated export
└── themes/
    └── green-pulse/
        ├── green-pulse.css               ← Theme variables (source)
        └── green-pulse.ts                ← Auto-generated export
```

### How It Works

1. **CSS files** are the source of truth in `packages/ui/src/styles/`
2. **Auto-generation script** creates `.ts` exports from `.css` files
3. **ThemeProvider** receives CSS strings via props (optional `themeSelector`)
4. **ThemeSelector** reads CSS from context and renders UI
5. **Changes saved** to database and applied via dynamic `<style>` tag

## License

MIT © EZStart
