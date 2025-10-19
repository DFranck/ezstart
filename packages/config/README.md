# @ezstart/config

**Centralized configuration for all environments, URLs, domains, and CORS across the monorepo.**

> ✅ **Created:** 16/10/2025 - Single source of truth for all URLs and CORS

## 🎯 Problem Solved

### Before
```typescript
// ❌ Hardcoded everywhere, duplicated, out of sync
const API_URL = 'http://localhost:5010'  // EZAuth API
const WEB_URL = 'https://ezauth.ezstart.xyz'  // Or was it .vercel.app?
const CORS_ORIGINS = 'http://localhost:3000,https://ezauth.vercel.app,...'  // 50+ URLs
```

### After
```typescript
// ✅ One config, auto environment detection
import { getApiUrl, getAllowedOrigins } from '@ezstart/config'

const API_URL = getApiUrl('ezauth')  // Auto: local/dev/prod
const allowedOrigins = getAllowedOrigins('ezauth')  // All valid origins
```

## 📦 Installation

```bash
pnpm add @ezstart/config
```

## 🚀 Usage

### Get URLs (Auto Environment Detection)

```typescript
import { getWebUrl, getApiUrl } from '@ezstart/config'

// Automatically detects local/dev/prod from NODE_ENV or VERCEL_ENV
const webUrl = getWebUrl('ezpay')
// Local: http://localhost:5045
// Dev: https://ezpay.vercel.app
// Prod: https://ezpay.ezstart.xyz

const apiUrl = getApiUrl('ezpay')
// Local: http://localhost:5040
// Prod: https://ezpay-api.up.railway.app
```

### CORS Configuration (Express)

```typescript
// apps/ezauth/api/src/index.ts
import { createCorsConfig } from '@ezstart/config/cors'
import cors from 'cors'
import express from 'express'

const app = express()

// ✅ Automatically allows ALL apps that need EZAuth
app.use(cors(createCorsConfig('ezauth')))

// Includes:
// - http://localhost:5015 (ezauth web local)
// - http://localhost:5025 (ezbill web local)
// - https://ezauth.ezstart.xyz
// - https://ezbill.ezstart.xyz
// - ... all other apps (since EZAuth = SSO for all)
```

### Get All URLs for an App

```typescript
import { getAllWebUrls, getAllApiUrls } from '@ezstart/config'

// For environment variables or documentation
const ezpayWebUrls = getAllWebUrls('ezpay')
// ['http://localhost:5045', 'https://ezpay.vercel.app', 'https://ezpay.ezstart.xyz']

const ezpayApiUrls = getAllApiUrls('ezpay')
// ['http://localhost:5040', 'https://ezpay-api.up.railway.app']
```

### Environment Detection

```typescript
import { isLocal, isProduction, isDevelopment, getCurrentEnvironment } from '@ezstart/config'

if (isLocal()) {
  console.log('Running locally')
}

if (isProduction()) {
  console.log('Running in production')
}

const env = getCurrentEnvironment()  // 'local' | 'development' | 'production'
```

**Environment Detection Strategy:**

- **Server-side (SSR):** Uses `process.env.VERCEL_ENV` or `process.env.NODE_ENV`
- **Client-side (CSR):** Detects from `window.location.hostname`
  - Production domains: `www.ai-greenpulse.com`, `*.ezstart.xyz`, `www.asc-tcd.com`
  - Development domains: `*.vercel.app`
  - Local: `localhost`, `127.0.0.1`

This ensures `getApiUrl()` and `getWebUrl()` work correctly in both SSR and CSR contexts.

### Get App URLs (Convenience)

```typescript
import { getAppUrls } from '@ezstart/config'

const { webUrl, apiUrl, environment } = getAppUrls('ezpay')

console.log(webUrl)  // Auto env-aware
console.log(apiUrl)  // Auto env-aware
console.log(environment)  // 'local' | 'development' | 'production'
```

## 📊 Complete URL Mapping

| App | Local Web | Local API | Production Web | Production API |
|-----|-----------|-----------|----------------|----------------|
| **EZStart** | :5050 | - | www.ezstart.xyz | - |
| **EZAuth** | :5015 | :5010 | ezauth.ezstart.xyz | ezauth-api.up.railway.app |
| **EZBill** | :5025 | :5020 | ezbill.ezstart.xyz | ezbill-api.up.railway.app |
| **EZPay** | :5045 | :5040 | ezpay.ezstart.xyz | ezpay-api.up.railway.app |
| **FengShui** | :5065 | - | ezfengshui.ezstart.xyz | - |
| **Tower Defense** | :5035 | :5030 | tower-defense.ezstart.xyz | tower-defense-api.up.railway.app |
| **ASC-TCD** | :5055 | - | www.asc-tcd.com | - |
| **GreenPulse** | :5075 | :5070 | www.ai-greenpulse.com | green-pulse-api.up.railway.app |

### Domain Patterns

**Vercel (Web Apps):**
- Development: `[app].vercel.app` (auto Vercel)
- Production: `[app].ezstart.xyz` OR custom domain

**Railway (APIs):**
- Production: `[app]-api.up.railway.app`

**Local:**
- Web: `localhost:50X5` (apps with 5)
- API: `localhost:50X0` (APIs with 0)

## 🔒 CORS Rules

### EZAuth API
Called by **ALL** web apps (SSO) → Allows all web URLs

### EZPay API
Called by apps with payments:
- EZPay web
- Tower Defense (donations)
- EZBill (invoice payments)

### EZBill API
Called only by EZBill web

### Tower Defense API
Called only by Tower Defense web

### GreenPulse API
Called only by GreenPulse web

## 🛠️ API Reference

### `getWebUrl(app: AppName, env?: Environment): string`

Get web URL for an app in the specified (or current) environment.

### `getApiUrl(app: AppName, env?: Environment): string`

Get API URL for an app in the specified (or current) environment.
Throws if app has no API.

### `getAllWebUrls(app: AppName): string[]`

Get all web URLs (local + dev + prod) for an app. Useful for CORS.

### `getAllApiUrls(app: AppName): string[]`

Get all API URLs (local + dev + prod) for an app.

### `getAllowedOrigins(apiApp: AppName): string[]`

Get all allowed CORS origins for a given API based on app dependencies.

### `createCorsConfig(apiApp: AppName): CorsOptions`

Create Express CORS middleware configuration with proper origin validation.

### `getCurrentEnvironment(): Environment`

Detect current environment from `VERCEL_ENV` or `NODE_ENV`.
Returns `'local'`, `'development'`, or `'production'`.

### `getAppUrls(app: AppName): { webUrl, apiUrl?, environment }`

Convenience function to get both web and API URLs with environment.

### `isLocal(): boolean`, `isProduction(): boolean`, `isDevelopment(): boolean`

Boolean helpers for environment checks.

## 🔄 Migration Guide

### Before (Scattered Config)

```typescript
// apps/ezpay/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5040

// apps/ezpay/api/src/index.ts
const allowedOrigins = [
  'http://localhost:5045',
  'https://ezpay.vercel.app',
  'https://ezpay.ezstart.xyz',
  // ... 50 more lines
]
```

### After (Centralized)

```typescript
// apps/ezpay/web/src/lib/api.ts
import { getApiUrl } from '@ezstart/config'

const API_URL = getApiUrl('ezpay')  // ✅ Auto env-aware

// apps/ezpay/api/src/index.ts
import { createCorsConfig } from '@ezstart/config/cors'

app.use(cors(createCorsConfig('ezpay')))  // ✅ All origins included
```

**Result:** Remove `.env.local` files, no more hardcoded URLs!

## 📝 Updating URLs

When adding a new domain or changing URLs:

1. **Edit `packages/config/src/urls.ts`**
```typescript
export const URLS: Record<AppName, AppUrls> = {
  'myapp': {
    web: {
      local: 'http://localhost:5XXX',
      development: 'https://myapp.vercel.app',
      production: 'https://myapp.ezstart.xyz',
    },
  },
}
```

2. **Build the package**
```bash
cd packages/config
pnpm build
```

3. **All apps auto-update** ✅

## 🎯 Use Cases

### 1. API Client in Web App

```typescript
// apps/ezbill/web/src/lib/api.ts
import { getApiUrl } from '@ezstart/config'

const apiClient = axios.create({
  baseURL: getApiUrl('ezbill'),  // Auto env-aware
})
```

### 2. Railway CORS Environment Variable

```bash
# Railway → Settings → Variables
ALLOWED_ORIGINS=$(node -e "
  const { getOriginsList } = require('@ezstart/config/cors')
  console.log(getOriginsList('ezauth'))
")
```

### 3. SEO Domain Configuration

```typescript
// apps/ezpay/web/src/app/robots.ts
import { getWebUrl } from '@ezstart/config'
import { createRobots } from '@ezstart/seo-config/robots'

export default function robots() {
  return createRobots({
    domain: getWebUrl('ezpay', 'production')
  })
}
```

### 4. Auth Redirect

```typescript
// apps/ezbill/web/src/app/auth/callback/page.tsx
import { getWebUrl } from '@ezstart/config'

const redirectUri = `${getWebUrl('ezbill')}/auth/callback`
```

## 🔗 Related Packages

- [`@ezstart/seo-config`](../seo-config/README.md) - SEO configuration
- [`@ezstart/next-config`](../next-config/README.md) - Next.js configuration
- [`@ezstart/express-core`](../express-core/README.md) - API infrastructure

## 🚨 Important Notes

### Environment Variables Still Needed

Some services require environment variables for secrets:
- `STRIPE_SECRET_KEY`
- `MONGO_URL`
- `JWT_SECRET`

**But URLs can now be imported from `@ezstart/config`!**

### Vercel Auto-Detection

On Vercel, `VERCEL_ENV` is automatically set:
- `production` → Main branch
- `development` → Preview deployments
- (falls back to `NODE_ENV` if not on Vercel)

### Railway Configuration

On Railway, set:
```bash
NODE_ENV=production
# URLs are auto-imported from @ezstart/config
```

## 📄 License

Private - @ezstart monorepo
