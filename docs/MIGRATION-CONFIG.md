# 🔄 Migration Guide - @ezstart/config

**How to migrate apps to use centralized URL configuration**

> Created: 16/10/2025

## 📋 What Changed

### Before (Scattered)
```bash
# 8 different .env.local files
apps/ezpay/web/.env.local:
  NEXT_PUBLIC_API_URL=http://localhost:5040

# Hardcoded CORS in APIs
apps/ezpay/api/src/index.ts:
  const allowedOrigins = ['http://localhost:5045', 'https://...', ...]
```

### After (Centralized)
```typescript
// One config for everything
import { getApiUrl, createCorsConfig } from '@ezstart/config'

const API_URL = getApiUrl('ezpay')  // Auto: local/dev/prod
app.use(cors(createCorsConfig('ezpay')))  // All origins included
```

---

## 🚀 Migration Steps

### 1. Add Package to App

```json
// apps/[app]/web/package.json or apps/[app]/api/package.json
{
  "dependencies": {
    "@ezstart/config": "workspace:*"
  }
}
```

```bash
pnpm install
```

### 2. Migrate Web App (Next.js)

#### Before
```typescript
// apps/ezpay/web/src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5040'

fetch(`${API_URL}/donations`)
```

#### After
```typescript
// apps/ezpay/web/src/lib/api.ts
import { getApiUrl } from '@ezstart/config'

const API_URL = getApiUrl('ezpay')  // ✅ Auto env-aware

fetch(`${API_URL}/donations`)
```

#### Cleanup
```bash
# Remove from .env.local
NEXT_PUBLIC_API_URL=...  # ❌ Delete this line
```

### 3. Migrate API (Express)

#### Before
```typescript
// apps/ezauth/api/src/index.ts
import cors from 'cors'

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5015',
  'http://localhost:5025',
  'https://ezauth.vercel.app',
  'https://ezbill.vercel.app',
  'https://ezauth.ezstart.xyz',
  'https://ezbill.ezstart.xyz',
  // ... 50+ more lines
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
```

#### After
```typescript
// apps/ezauth/api/src/index.ts
import cors from 'cors'
import { createCorsConfig } from '@ezstart/config/cors'

app.use(cors(createCorsConfig('ezauth')))  // ✅ Done!
```

**Result:** Automatically includes ALL apps (since EZAuth = SSO for all)

#### Cleanup
```bash
# Remove from .env or Railway/Vercel env vars
ALLOWED_ORIGINS=...  # ❌ Delete this
```

### 4. Migrate SEO Config

#### Before
```typescript
// apps/ezpay/web/src/app/robots.ts
export default function robots() {
  return createRobots({
    domain: 'https://ezpay.vercel.app'  // ❌ Hardcoded
  })
}
```

#### After
```typescript
// apps/ezpay/web/src/app/robots.ts
import { getWebUrl } from '@ezstart/config'
import { createRobots } from '@ezstart/seo-config/robots'

export default function robots() {
  return createRobots({
    domain: getWebUrl('ezpay', 'production')  // ✅ Dynamic
  })
}
```

### 5. Migrate Auth Redirects

#### Before
```typescript
// apps/ezbill/web/src/app/auth/callback/page.tsx
const redirectUri = `https://ezbill.ezstart.xyz/auth/callback`  // ❌ Hardcoded
```

#### After
```typescript
// apps/ezbill/web/src/app/auth/callback/page.tsx
import { getWebUrl } from '@ezstart/config'

const redirectUri = `${getWebUrl('ezbill')}/auth/callback`  // ✅ Auto env
```

---

## 📊 Migration Checklist

### For Each Web App

- [ ] Add `@ezstart/config` to package.json
- [ ] Replace `process.env.NEXT_PUBLIC_API_URL` with `getApiUrl(app)`
- [ ] Replace hardcoded domain in SEO files with `getWebUrl(app, 'production')`
- [ ] Replace hardcoded URLs in auth redirects with `getWebUrl(app)`
- [ ] Remove `.env.local` if only contains URLs (keep secrets!)
- [ ] Test locally: `pnpm dev`
- [ ] Test build: `pnpm build`

### For Each API

- [ ] Add `@ezstart/config` to package.json
- [ ] Replace custom CORS logic with `createCorsConfig(app)`
- [ ] Remove `ALLOWED_ORIGINS` from environment variables
- [ ] Test CORS locally with web app
- [ ] Deploy and test in production

---

## 🎯 Priority Migration Order

### 1. High Priority (Auth & Payments)

**EZAuth API** - SSO for all apps
```typescript
import { createCorsConfig } from '@ezstart/config/cors'
app.use(cors(createCorsConfig('ezauth')))
```

**EZPay API** - Payment service
```typescript
import { createCorsConfig } from '@ezstart/config/cors'
app.use(cors(createCorsConfig('ezpay')))
```

### 2. Medium Priority (Active Apps)

- EZBill (web + API)
- Tower Defense (web + API)
- GreenPulse (web + API)

### 3. Low Priority (Static/Simple)

- EZStart (web only)
- FengShui (web only)
- ASC-TCD (web only)

---

## 🔍 Common Patterns

### Pattern 1: API Client

```typescript
// Before
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
})

// After
import { getApiUrl } from '@ezstart/config'

const apiClient = axios.create({
  baseURL: getApiUrl('ezpay')
})
```

### Pattern 2: Environment-Specific Logic

```typescript
// Before
if (process.env.NODE_ENV === 'development') {
  apiUrl = 'http://localhost:5040'
} else {
  apiUrl = 'https://ezpay-api.up.railway.app'
}

// After
import { getApiUrl } from '@ezstart/config'

const apiUrl = getApiUrl('ezpay')  // Auto!
```

### Pattern 3: CORS for Specific Apps

```typescript
// EZPay API needs: EZPay web, Tower Defense web, EZBill web
import { createCorsConfig } from '@ezstart/config/cors'

// ✅ Automatically includes these based on package logic
app.use(cors(createCorsConfig('ezpay')))
```

---

## ⚠️ Important Notes

### Keep Secrets in .env

```bash
# ✅ Still needed in .env.local
STRIPE_SECRET_KEY=sk_test_...
MONGO_URL=mongodb://...
JWT_SECRET=secret123

# ❌ Remove from .env.local (now in @ezstart/config)
NEXT_PUBLIC_API_URL=...
ALLOWED_ORIGINS=...
```

### Vercel Environment Variables

On Vercel, only keep secrets:
- `STRIPE_PUBLISHABLE_KEY`
- Other API keys

**Remove:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEB_URL`

### Railway Environment Variables

On Railway, only keep secrets:
- `STRIPE_SECRET_KEY`
- `MONGO_URL`
- `JWT_SECRET`

**Remove:** `ALLOWED_ORIGINS`, `WEB_URL`, `API_URL`

---

## 🧪 Testing

### Test Locally

```bash
# Start API
cd apps/ezpay/api
pnpm dev  # Should use localhost:5040

# Start Web
cd apps/ezpay/web
pnpm dev  # Should connect to localhost:5040

# Test CORS
# Web app should successfully call API without CORS errors
```

### Test Production

```bash
# Deploy API first
git push  # Railway auto-deploys

# Deploy Web
git push  # Vercel auto-deploys

# Test
# Open https://ezpay.ezstart.xyz
# Should connect to https://ezpay-api.up.railway.app
# No CORS errors in console
```

---

## 📝 Updating URLs

If you need to change a domain:

```typescript
// packages/config/src/urls.ts
export const URLS = {
  'ezpay': {
    web: {
      production: 'https://new-domain.com'  // ✅ Update here
    }
  }
}
```

```bash
cd packages/config
pnpm build
# All apps automatically use new URL ✅
```

---

## 🔗 Related

- [packages/config/README.md](../packages/config/README.md) - Full API documentation
- [CLAUDE.md](../CLAUDE.md) - Complete monorepo documentation

---

**Questions?** Check the README or commit history for examples.
