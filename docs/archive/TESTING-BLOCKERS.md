# Testing Blockers - @ezstart Monorepo

**Last Updated:** 2025-10-25

This document tracks technical blockers encountered during the testing implementation and their solutions.

---

## 🚧 Active Blockers

_(No active blockers)_

## ✅ Resolved Blockers

### 1. EZBill API - Mongoose Global Connection Issue

**Status:** ✅ RESOLVED
**Phase:** 3.3 (App-Specific Testing)
**Resolved:** 2025-10-25
**Impact:** Cannot test EZBill models with mongodb-memory-server
**Discovered:** 2025-10-25

#### Problem

EZBill models export using Mongoose's global `model()` function:

```typescript
// apps/ezbill/api/src/models/client.ts
import { model } from 'mongoose'

export const ClientModel = model<ClientDocument>('Client', clientSchema)
```

This creates models attached to the **global mongoose connection**, which:
- ❌ Cannot connect to mongodb-memory-server test database
- ❌ Operations timeout waiting for connection
- ❌ Tests fail with "buffering timed out after 10000ms"

**Test Error:**
```
MongooseError: Operation `clients.deleteMany()` buffering timed out after 10000ms
```

#### Root Cause

The test setup uses `@ezstart/test-utils` which:
1. Creates a mongodb-memory-server instance
2. Provides a connection URI
3. **But:** Models are already instantiated with global mongoose

Models need to be created **after** connecting to the test database.

#### Comparison: Why Tower Defense Works

Tower Defense uses **factory functions** instead of direct exports:

```typescript
// apps/tower-defense/api/src/managers/GameManager.ts
class GameManager {
  private games = new Map<string, GameInstance>()
  // ... methods
}

export const gameManager = new GameManager() // Singleton, no MongoDB
```

Tower Defense managers:
- ✅ Use in-memory Maps (no database)
- ✅ No Mongoose models in core logic
- ✅ Entity registry is seeded from static data

#### Solution Options

**Option 1: Refactor to Factory Pattern (RECOMMENDED)**

Create factory functions that return models connected to the test database:

```typescript
// apps/ezbill/api/src/models/client.ts
import { Connection, Schema } from 'mongoose'

const clientSchema = new Schema({
  userId: { type: String, required: true },
  // ...
})

export function createClientModel(connection: Connection) {
  return connection.model('Client', clientSchema)
}

// For production use
export { ClientModel } from './client-production.js'
```

**Effort:** 6-8 hours
**Impact:** Enables all model testing
**Risk:** Requires refactoring all 6 models + all controllers/routes

**Option 2: Integration Tests with Real MongoDB**

Use a real MongoDB instance (Atlas test cluster or local) instead of memory server:

```typescript
// Use real MongoDB for integration tests
beforeAll(async () => {
  await mongoose.connect(process.env.TEST_MONGO_URL!)
})
```

**Effort:** 2-3 hours
**Impact:** Tests work but slower (network latency)
**Risk:** Requires MongoDB Atlas account or local server

**Option 3: Mock Mongoose Models**

Mock the model methods instead of using real database:

```typescript
import { vi } from 'vitest'
import { ClientModel } from '../../models/client.js'

vi.mock('../../models/client.js', () => ({
  ClientModel: {
    create: vi.fn(),
    find: vi.fn(),
    // ...
  }
}))
```

**Effort:** 4-5 hours
**Impact:** Tests pass but not true integration tests
**Risk:** Mocks may diverge from real behavior

#### Solution Implemented ✅

**Chose Option 1 - Factory Pattern (RECOMMENDED)**

Copied the pattern from EZAuth API which already used this approach:

1. ✅ Refactored `ClientModel` to `getClientModel()` factory function
2. ✅ Factory calls `connectToMongo('ezbill')` to get shared connection
3. ✅ Returns model attached to correct connection (cached if exists)
4. ✅ Updated all 7 client service functions to use factory
5. ✅ Created Client.test.ts with 13 comprehensive tests
6. ✅ Fixed TypeScript types (ClientDocument = Client & Document)

**Results:**
- ✅ 13/13 tests passing with mongodb-memory-server
- ✅ pnpm typecheck passes (0 errors)
- ✅ No buffering timeouts
- ✅ Tests run fast and isolated (~4.5s for 13 tests)
- ✅ Pattern established for all future models

**Time taken:** 2.5 hours (better than estimated 6-8h because EZAuth pattern existed)

#### Implementation Status

**Phase 3.3 - Factory Pattern:**
- ✅ Refactor ClientModel to factory pattern (completed)
- ✅ Write Client model tests - 13/13 passing (completed)
- ✅ Update all client controllers to use factory (completed)
- ✅ Fix TypeScript types and typecheck (completed)
- ⏳ Refactor InvoiceModel to factory pattern (next)
- ⏳ Write Invoice model tests (next)
- ⏳ Update invoice controllers to use factory (next)
- ⏳ Document pattern in DEV-RULES.md (after all models done)

#### Lessons Learned

1. **Check model architecture before writing tests**
   - Understand connection strategy (global vs factory)
   - Verify compatibility with test utilities

2. **Factory pattern > Global singletons for testability**
   - Enables dependency injection
   - Works with any database connection
   - Easier to mock/stub

3. **In-memory > Real database for unit tests**
   - Tower Defense's approach (no DB) is fastest
   - mongodb-memory-server is second best
   - Real MongoDB should be integration tests only

#### Files Modified

**Models:**
- [apps/ezbill/api/src/models/client.ts](apps/ezbill/api/src/models/client.ts) - Factory pattern refactor

**Services:**
- [apps/ezbill/api/src/services/client/client.services.ts](apps/ezbill/api/src/services/client/client.services.ts) - All 7 functions updated

**Tests:**
- [apps/ezbill/api/src/__tests__/models/Client.test.ts](apps/ezbill/api/src/__tests__/models/Client.test.ts) - 13 comprehensive tests

**Config:**
- [apps/ezbill/api/tsconfig.json](apps/ezbill/api/tsconfig.json) - Removed jest types
- [apps/ezbill/api/vitest.config.ts](apps/ezbill/api/vitest.config.ts) - Testing setup
- [apps/ezbill/api/package.json](apps/ezbill/api/package.json) - Vitest dependencies

**Commits:**
- fd5f851 - test(ezbill): refactor Client model to factory pattern + 13 passing tests
- fd7c86b - refactor(ezbill): update controllers to use getClientModel() factory + fix types

---

### 2. Tower Defense - Entity Registry Not Seeded

**Status:** ✅ RESOLVED
**Resolved:** 2025-10-25

**Problem:** EntityManager tests failed because entity registry wasn't seeded.

**Solution:** Added `seedEntityTypes()` in `beforeAll` hook:

```typescript
beforeAll(async () => {
  await seedEntityTypes()
})
```

**Lesson:** Test setup must replicate production initialization.

---

## 📚 References

- [MongoDB Connection Architecture](../packages/express-core/MONGODB-ARCHITECTURE.md)
- [Testing Strategy V2](./TESTING-STRATEGY-V2.md)
- [DEV-RULES.md](../DEV-RULES.md)
