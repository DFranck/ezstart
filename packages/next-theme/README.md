# @ezstart/next-theme

Next.js theme provider with hydration-safe implementation for dark/light mode management.

## Overview

This package provides a centralized theme management solution for all Next.js applications in the @ezstart monorepo. It wraps `next-themes` with additional features and ensures consistent theming across all apps.

## Features

- 🌓 **Dark/Light Mode** - Seamless theme switching
- 🎨 **System Preference Detection** - Auto-detects user's OS theme
- ⚡ **Hydration Safe** - No flash of unstyled content
- 🔧 **Theme Toggle Component** - Ready-to-use UI component
- 🎯 **TypeScript Support** - Full type safety
- 📦 **Zero Config** - Works out of the box

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

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
- ✅ **web-ez-billing** - Invoicing app
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

## License

MIT © EZStart
