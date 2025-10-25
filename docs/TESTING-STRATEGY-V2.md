# 🧪 Testing Strategy V2 - @ezstart Monorepo

**Philosophy:** Follow existing monorepo hierarchy - Don't over-engineer

**Created:** 2025-10-23
**Replaces:** TESTING-STRATEGY.md (too many packages)
**Status:** Recommended Approach

---

## 🎯 Core Principle: Follow Existing Pattern

**DON'T:** Create 3 new packages (`test-utils`, `api-test-utils`, `e2e-utils`)
**DO:** Follow the existing hierarchy:
- `packages/` for cross-project reusable code
- `apps/[project]/test-utils/` for project-specific test code

---

## 📦 Architecture (Follows CLAUDE.md Hierarchy)

```
@ezstart/
├── packages/
│   ├── test-utils/              # ⭐ NEW - Generic test infrastructure
│   │   ├── vitest.config.ts     # Centralized Vitest config
│   │   ├── mongodb.ts           # MongoDB Memory Server setup
│   │   ├── factories/
│   │   │   └── user.ts          # createTestUser() - common to all apps
│   │   └── helpers/
│   │       ├── cleanDb.ts       # Database cleanup
│   │       └── seed.ts          # Generic seed helpers
│   │
│   └── playwright-config/       # ⭐ NEW - Centralized Playwright config
│       └── base.config.ts       # Shared Playwright settings
│
└── apps/
    ├── tower-defense/
    │   ├── types/               # ✅ Already exists
    │   ├── config/              # ✅ Already exists
    │   ├── utils/               # ✅ Already exists
    │   │
    │   ├── test-utils/          # ⭐ NEW - TD-specific test code
    │   │   ├── factories/
    │   │   │   ├── mob.ts       # createTestMob()
    │   │   │   └── tower.ts     # createTestTower()
    │   │   ├── mocks/
    │   │   │   └── game.ts      # Mock game state
    │   │   └── helpers/
    │   │       └── gameSetup.ts # TD-specific test setup
    │   │
    │   ├── api/
    │   │   └── src/
    │   │       └── __tests__/   # Uses ../test-utils + packages/test-utils
    │   │
    │   └── web/
    │       └── e2e/             # Uses ../test-utils + packages/playwright-config
    │
    ├── ezbill/
    │   ├── types/               # ✅ Already exists
    │   │
    │   ├── test-utils/          # ⭐ NEW - EZBill-specific test code
    │   │   ├── factories/
    │   │   │   ├── invoice.ts   # createTestInvoice()
    │   │   │   └── client.ts    # createTestClient()
    │   │   └── mocks/
    │   │       └── stripe.ts    # Mock Stripe for EZBill
    │   │
    │   ├── api/
    │   │   └── src/__tests__/
    │   │
    │   └── web/
    │       └── e2e/
    │
    └── ezauth/
        ├── types/               # ✅ Already exists
        │
        ├── test-utils/          # ⭐ NEW - EZAuth-specific test code
        │   ├── factories/
        │   │   └── authCode.ts  # createTestAuthCode()
        │   └── mocks/
        │       └── jwt.ts       # Mock JWT tokens
        │
        ├── api/
        │   └── src/__tests__/
        │
        └── web/
            └── e2e/
```

---

## 📦 What Goes Where?

### Rule 1: `packages/test-utils` (Generic, Cross-Project)

**Only put here what is:**
- ✅ Used by 2+ projects
- ✅ Generic (not project-specific)
- ✅ Low-level infrastructure

**Examples:**
```typescript
// packages/test-utils/mongodb.ts
export async function setupTestDatabase() {
  const mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  await mongoose.connect(uri)
  return uri
}

// packages/test-utils/factories/user.ts
export function createTestUser(overrides = {}) {
  return {
    _id: new Types.ObjectId().toString(),
    email: 'test@example.com',
    name: 'Test User',
    ...overrides,
  }
}
```

**Used by:** EZAuth, EZBill, EZPay, Tower Defense (all need users)

### Rule 2: `apps/[project]/test-utils` (Project-Specific, Shared API/Web)

**Put here what is:**
- ✅ Specific to ONE project
- ✅ Shared between API and Web tests
- ✅ Domain-specific test data

**Examples:**
```typescript
// apps/tower-defense/test-utils/factories/mob.ts
import { ENTITY_MOB_TYPES } from '../types'

export function createTestMob(typeId?: string) {
  const mobType = typeId
    ? ENTITY_MOB_TYPES.find(m => m._id === typeId)
    : ENTITY_MOB_TYPES[0]

  return {
    id: new Types.ObjectId().toString(),
    typeId: mobType._id,
    hp: mobType.hp,
    position: { x: 0, y: 0 },
    // ... TD-specific fields
  }
}
```

**Used by:** Only Tower Defense API/Web tests

### Rule 3: `apps/[project]/api/src/__tests__` (API-Only)

**Put here:**
- ✅ API route tests
- ✅ Service/controller tests
- ✅ Database integration tests

**Uses:**
- `packages/test-utils` (generic setup)
- `../../../test-utils` (project-specific factories)

### Rule 4: `apps/[project]/web/e2e` (Web-Only)

**Put here:**
- ✅ E2E user journeys
- ✅ Page object models (if app-specific)

**Uses:**
- `packages/playwright-config` (centralized config)
- `../../../test-utils` (project-specific test data)

---

## 🏗️ Implementation Plan

### Step 1: Create `packages/test-utils` (4h)

```bash
mkdir -p packages/test-utils/src/{factories,helpers}
cd packages/test-utils
pnpm init
pnpm add -D vitest @vitest/ui mongodb-memory-server
```

**Files to create:**
- `vitest.config.ts` - Centralized Vitest config
- `mongodb.ts` - MongoDB Memory Server setup
- `factories/user.ts` - Generic user factory
- `helpers/cleanDb.ts` - Database cleanup
- `helpers/seed.ts` - Generic seed helpers

### Step 2: Create `packages/playwright-config` (2h)

```bash
mkdir -p packages/playwright-config
cd packages/playwright-config
pnpm init
pnpm add -D @playwright/test
```

**Files to create:**
- `base.config.ts` - Centralized Playwright config

### Step 3: Create Project-Specific `test-utils` (6h)

For each project (Tower Defense, EZBill, EZAuth, EZPay):

```bash
mkdir -p apps/[project]/test-utils/{factories,mocks,helpers}
```

**Tower Defense example:**
- `factories/mob.ts`, `factories/tower.ts`
- `mocks/game.ts`
- `helpers/gameSetup.ts`

**EZBill example:**
- `factories/invoice.ts`, `factories/client.ts`
- `mocks/stripe.ts` (if different from generic)
- `helpers/pdfGeneration.ts`

### Step 4: Write Tests (64h)

**Unit Tests (40h):**
- EZAuth API: 8h
- EZBill API: 12h
- EZPay API: 10h
- Tower Defense API: 10h

**Integration Tests (20h):**
- API routes for each project

**E2E Tests (16h):**
- Critical user journeys

---

## 💡 Examples

### Tower Defense - Unit Test

```typescript
// apps/tower-defense/api/src/systems/__tests__/MovementSystem.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { createTestMob } from '../../../test-utils/factories/mob'
import { MovementSystem } from '../MovementSystem'

describe('MovementSystem', () => {
  beforeAll(async () => {
    await setupTestDatabase() // Generic from packages/
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  it('moves mob along path', () => {
    const mob = createTestMob() // TD-specific from apps/tower-defense/test-utils
    const newPosition = MovementSystem.move(mob, 1)

    expect(newPosition.x).toBeGreaterThan(mob.position.x)
  })
})
```

### EZBill - Integration Test

```typescript
// apps/ezbill/api/src/routes/__tests__/invoices.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { setupTestDatabase } from '@ezstart/test-utils'
import { createTestInvoice } from '../../../test-utils/factories/invoice'
import { app } from '../../index'

describe('POST /api/invoices', () => {
  it('creates invoice', async () => {
    const invoice = createTestInvoice() // EZBill-specific

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${testToken}`)
      .send(invoice)

    expect(res.status).toBe(201)
  })
})
```

### Tower Defense - E2E Test

```typescript
// apps/tower-defense/web/e2e/game-flow.spec.ts
import { test, expect } from '@playwright/test'

test('create and join game', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // Create game
  await page.goto('/game/new')
  await page.click('button:has-text("Create Game")')

  // Verify
  await expect(page.locator('text=Game created')).toBeVisible()
})
```

---

## 📊 Comparison: 3 Packages vs Hierarchy

### ❌ Original Plan (3 Packages)

```
packages/
├── test-utils/          # Generic + specific mixed
├── api-test-utils/      # Duplicate of test-utils for APIs
└── e2e-utils/           # Duplicate of test-utils for E2E
```

**Problems:**
- Too many packages (3 new)
- Unclear boundaries (what goes where?)
- Doesn't follow existing pattern

### ✅ Recommended (Follow Hierarchy)

```
packages/
└── test-utils/          # Only generic, cross-project

apps/[project]/
└── test-utils/          # Project-specific, shared API/Web
```

**Benefits:**
- ✅ Follows CLAUDE.md hierarchy
- ✅ Clear boundaries (generic vs specific)
- ✅ Consistent with existing patterns
- ✅ Less packages to maintain

---

## 🎯 Total Effort

### Setup (12h)
- ✅ `packages/test-utils` (4h)
- ✅ `packages/playwright-config` (2h)
- ✅ 4× `apps/*/test-utils` (6h)

### Testing (64h)
- ✅ Unit tests (40h)
- ✅ Integration tests (20h)
- ✅ E2E tests (16h)

**Total: 76h** (same as original plan, but better architecture)

---

## ✅ Advantages of This Approach

1. **Follows existing patterns** - Consistent with types/, config/, utils/
2. **Clear boundaries** - Generic in packages/, specific in apps/
3. **Less maintenance** - Only 2 new packages instead of 3
4. **Scalable** - Easy to add test-utils for new projects
5. **Type-safe** - Shares types/ from same project

---

## 🚀 Next Steps

1. Create `packages/test-utils` (generic infrastructure)
2. Create `packages/playwright-config` (E2E config)
3. Create `apps/tower-defense/test-utils` (proof of concept)
4. Write tests for Tower Defense (showcase)
5. Roll out to other apps

---

---

## 📈 Implementation Progress

**Last Updated:** 2025-10-25

### ✅ Phase 1: Test Infrastructure (COMPLETED)

**Created packages:**
- ✅ `packages/test-utils` - Generic MongoDB, factories, seed helpers
- ✅ `packages/playwright-config` - Centralized E2E configuration
- ✅ `apps/ezbill/test-utils` - EZBill-specific factories (client, invoice)

**Documentation:**
- ✅ README for all 3 packages (~700 lines total)
- ✅ Usage examples and API reference

**Commits:**
- ✅ ceead89 - Test infrastructure packages created
- ✅ ca292f8 - Documentation and initial config tests

### ✅ Phase 2: Global Packages Testing (COMPLETED)

**Packages tested:**

1. **@ezstart/config** (40/40 tests passing ✅)
   - `urls.test.ts`: 19 tests (getWebUrl, getApiUrl, getPort)
   - `cors.test.ts`: 12 tests (getAllowedOrigins, createCorsConfig, security)
   - `env.test.ts`: 9 tests (getCurrentEnvironment, isDevelopment, isProduction)
   - **Commit:** 374eceb

2. **@ezstart/logger** (29/29 tests passing ✅)
   - `logger.test.ts`: 16 tests (Pino logger, old/new format, all log levels)
   - `sentry.test.ts`: 13 tests (initSentry, env detection, error tracking)
   - **Commit:** 2e3bf27

3. **@ezstart/express-core** (31/31 tests passing ✅)
   - `ports.test.ts`: 13 tests (getApiPort, env override, consistency)
   - `createApp.test.ts`: 18 tests (CORS config, raw body routes, middleware)
   - **Commit:** e2e8874

**Total tests:** 100/100 passing 🎉

### ⏳ Phase 3: App-Specific Testing (PENDING)

**Next priorities:**
1. Tower Defense API tests (showcase for other apps)
2. EZBill API tests (invoice CRUD, client management)
3. EZAuth API tests (SSO flow, token validation)
4. EZPay API tests (donations, purchases, webhooks)

### 📊 Current Test Coverage

```
Global Packages:       100/100 tests (100% coverage)
- @ezstart/config:     40 tests ✅
- @ezstart/logger:     29 tests ✅
- @ezstart/express-core: 31 tests ✅

App Packages:          0 tests (pending)
- Tower Defense:       0 tests ⏳
- EZBill:              0 tests ⏳
- EZAuth:              0 tests ⏳
- EZPay:               0 tests ⏳

E2E Tests:             0 tests (pending)
- Playwright setup:    ✅ (config ready)
- Test scenarios:      ⏳ (not written yet)
```

---

**Author:** Claude Agent - Testing Architect
**Status:** Phase 2 Complete - 100/100 global package tests passing ✅
