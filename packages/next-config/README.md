# @ezstart/next-config

Centralized Next.js configuration for all @ezstart web applications.

## Overview

`@ezstart/next-config` provides standardized Next.js configurations that ensure consistency and optimal performance across all web applications in the @ezstart monorepo.

## Installation

This package is automatically included in all @ezstart web applications via workspace dependencies:

```json
{
  "devDependencies": {
    "@ezstart/next-config": "workspace:*"
  }
}
```

## Usage

### Basic Configuration

```js
// next.config.mjs
import { createNextConfig } from '@ezstart/next-config'

export default createNextConfig({
  // Your app-specific configuration
})
```

### Base Configuration Only

```js
// next.config.mjs
export { baseConfig as default } from '@ezstart/next-config/base'
```

### With PWA Support

```js
// next.config.mjs
import { createPWAConfig } from '@ezstart/next-config/pwa'

export default createPWAConfig({
  // PWA and app-specific configuration
})
```

## Included Features

### 🚀 Performance Optimizations

- **Transpile Packages** - Automatic transpilation of workspace packages
- **Bundle Analysis** - Built-in bundle analyzer configuration
- **Image Optimization** - Next.js Image component optimizations
- **Compression** - Automatic Gzip compression

### 📦 Monorepo Integration

- **Workspace Packages** - Automatic transpilation of:
  - `@ezstart/ui`
  - `@ezstart/types`
  - `@ezstart/auth-sdk`
  - `@ezstart/next-theme`

### 🔧 Development Features

- **Hot Reload** - Optimized development experience
- **Fast Refresh** - React Fast Refresh enabled
- **Source Maps** - Development source maps
- **TypeScript** - Full TypeScript support

### 🛡️ Production Optimizations

- **Minification** - JavaScript and CSS minification
- **Tree Shaking** - Dead code elimination
- **Code Splitting** - Automatic code splitting
- **Static Optimization** - Static page generation

### ⚙️ ESLint Integration

- **Build-time Linting** - ESLint validation during builds
- **Centralized Rules** - Uses `@ezstart/eslint-config`
- **Error Prevention** - Build fails on ESLint errors

## Configuration Options

### Base Configuration

The base configuration includes:

```js
{
  // Packages du monorepo à transpiler
  transpilePackages: ['@ezstart/ui', '@ezstart/types', '@ezstart/auth-sdk'],
  
  // Configuration ESLint standard
  eslint: {
    ignoreDuringBuilds: false // Force validation during build
  },
  
  // Optimisations de performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@ezstart/ui', '@ezstart/auth-sdk']
  },
  
  // Configuration des images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7 // 7 days
  },
  
  // Compression Gzip
  compress: true,
  
  // Génération de source maps en production  
  productionBrowserSourceMaps: false
}
```

### PWA Configuration

For Progressive Web App features:

```js
{
  ...baseConfig,
  // PWA-specific configuration
  pwa: {
    dest: 'public',
    disable: process.env.NODE_ENV === 'development'
  }
}
```

## Applications Using This Config

All @ezstart web applications use this centralized configuration:

- ✅ **ezauth/web** - Authentication service (port 8080)
- ✅ **ez-billing/web** - Billing management (port 4100)  
- ✅ **ezstart/web** - Main application (port 4000)
- ✅ **fengshui/web** - Feng Shui application (port 4400)
- ✅ **tower-defense/web** - Tower Defense game (port 4200)
- ✅ **asc-tcd/web** - ASC-TCD website (port 4300)

## Migration from Custom Config

### Before (Custom Configuration)

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ezstart/ui'],
  // Custom ESLint, image, performance config...
}

module.exports = nextConfig
```

### After (Centralized Configuration)

```js
// next.config.mjs  
import { createNextConfig } from '@ezstart/next-config'

export default createNextConfig({
  // Only app-specific overrides needed
})
```

## Environment Variables

The configuration automatically handles common environment variables:

```env
# Development
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development

# Production  
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production

# Bundle analysis
ANALYZE=true  # Enables bundle analyzer
```

## Custom Overrides

You can override or extend the base configuration:

```js
import { createNextConfig } from '@ezstart/next-config'

export default createNextConfig({
  // Override specific settings
  experimental: {
    ...baseConfig.experimental,
    serverActions: true  // Add server actions
  },
  
  // Add custom redirects
  redirects: async () => [
    {
      source: '/old-path',
      destination: '/new-path',
      permanent: true
    }
  ],
  
  // Add custom headers
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' }
      ]
    }
  ]
})
```

## Development

### Package Structure

```
packages/next-config/
├── src/
│   ├── base.js          # Base configuration
│   ├── pwa.js           # PWA configuration  
│   └── index.js         # Main exports
├── package.json
└── README.md
```

### Dependencies

This package provides peer dependencies for:

- `next` - Next.js framework
- Common optimization plugins
- Development tools

## Related Packages

- [`@ezstart/eslint-config`](../eslint-config/README.md) - ESLint configuration
- [`@ezstart/typescript-config`](../typescript-config/README.md) - TypeScript configuration
- [`@ezstart/tailwind-config`](../tailwind-config/README.md) - Tailwind CSS configuration
- [`@ezstart/next-theme`](../next-theme/README.md) - Theme management (dark/light mode)

## Best Practices

### 1. Always Use Centralized Config

✅ **Do:** Use the centralized configuration
```js
import { createNextConfig } from '@ezstart/next-config'
export default createNextConfig({})
```

❌ **Don't:** Create custom configurations from scratch
```js
const nextConfig = { /* manual config */ }
```

### 2. Minimal Overrides

Only override what's absolutely necessary for your specific app:

```js
export default createNextConfig({
  // Only app-specific configuration
  basePath: '/my-app',
  assetPrefix: '/my-app'
})
```

### 3. Environment-Specific Configs

Use environment variables for different configurations:

```js
export default createNextConfig({
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined
})
```