# @ezstart/next-core

Next.js infrastructure and providers for @ezstart web applications.

## Overview

`@ezstart/next-core` provides standardized Next.js architecture and shared components for all web applications in the monorepo, ensuring consistency and reusability.

## Installation

```bash
pnpm add @ezstart/next-core
```

## Architecture

### Standardized React Providers

The package provides two approaches for provider integration:

#### SimpleWebProviders (Recommended)
```tsx
import { SimpleWebProviders } from '@ezstart/next-core/providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <SimpleWebProviders appName="my-app">
          {children}
        </SimpleWebProviders>
      </body>
    </html>
  )
}
```

#### WebProviders (Advanced)
```tsx
import { WebProviders } from '@ezstart/next-core/providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <WebProviders 
          appName="mon-app" 
          theme="system"
          enableAuth={true}
        >
          {children}
        </WebProviders>
      </body>
    </html>
  )
}
```

### Provider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appName` | `string` | **required** | Application name for identification |
| `theme` | `"light" \| "dark" \| "system"` | `"system"` | Default theme |
| `enableAuth` | `boolean` | `true` | Enable EZAuth authentication |
| `children` | `ReactNode` | **required** | Application content |

## Web Application Standardization

### Required Configuration

Each web application must use centralized configurations:

#### package.json
```json
{
  "dependencies": {
    "@ezstart/ui": "workspace:*",
    "@ezstart/next-core": "workspace:*"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/next-config": "workspace:*",
    "@workspace/tailwind-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*"
  },
  "scripts": {
    "dev": "next dev --turbopack -p [PORT]",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "typecheck": "tsc --noEmit"
  }
}
```

#### Global CSS
```css
/* app/globals.css */
@import "@ezstart/ui/globals.css";
```

#### Tailwind Configuration
```js
// tailwind.config.js
module.exports = require('@workspace/tailwind-config/base.js')
```

#### PostCSS Configuration
```js
// postcss.config.mjs
export { default } from '@ezstart/ui/postcss.config'
```

#### ESLint Configuration
```js
// eslint.config.js
module.exports = require('@workspace/eslint-config/next-js')
```

#### Next.js Configuration
```js
// next.config.mjs
import { createNextConfig } from '@workspace/next-config'

export default createNextConfig({
  // App-specific configuration
})
```

### Standardized Layout

Recommended structure for `app/layout.tsx`:

```tsx
import { SimpleWebProviders } from '@ezstart/next-core/providers'
import '@ezstart/ui/globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My App',
  description: 'My app description',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-sans antialiased">
        <SimpleWebProviders appName="my-app">
          {children}
        </SimpleWebProviders>
      </body>
    </html>
  )
}
```

## Included Features

### 🎨 Theming
- Automatic light/dark theme support
- User preference persistence
- System synchronization

### 🔐 Authentication
- Automatic EZAuth integration
- Session management
- React hooks for authentication state

### 🌐 Internationalization
- Built-in next-intl configuration
- Multi-language support
- SSR/SSG optimization

### ⚡ Performance
- Next.js 15 optimizations
- Automatic code splitting
- Optimized hydration

## Standardized Applications

The following applications use this architecture:

- ✅ **ezauth/web** - Authentication service
- ✅ **ez-billing/web** - Billing management
- ✅ **ezstart/web** - Main application
- ✅ **fengshui/web** - Feng Shui application
- ✅ **tower-defense/web** - Tower Defense game
- ❌ **asc-tcd/web** - Not standardized (specific configuration)

## Migration

### From manual configuration

1. **Add dependencies**
```bash
pnpm add @ezstart/next-core @ezstart/ui
```

2. **Replace providers**
```tsx
// Before
<ThemeProvider>
  <AuthProvider>
    {children}
  </AuthProvider>
</ThemeProvider>

// After
<SimpleWebProviders appName="my-app">
  {children}
</SimpleWebProviders>
```

3. **Migrate configurations**
- Remove local configs
- Use workspace packages
- Update package.json

4. **Test the application**
```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
```

## Development

### Package structure

```
packages/next-core/
├── src/
│   ├── providers.tsx      # Server-side provider
│   ├── client-providers.tsx  # Client-side providers
│   └── index.ts          # Main exports
├── package.json
└── README.md
```

### Available scripts

```bash
# Build package
pnpm build

# Watch mode
pnpm dev

# Tests
pnpm test
```

## Useful Links

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [@ezstart/ui Package](../ui/README.md)
- [Tailwind Configuration](../../workspaces/tailwind-config/README.md)
- [ESLint Configuration](../../workspaces/eslint-config/README.md)
- [EZAuth SDK](../auth-sdk/README.md)