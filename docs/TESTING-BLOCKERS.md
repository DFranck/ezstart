# Testing Blockers - @ezstart Monorepo

**Last Updated:** 2025-10-25

This document tracks technical blockers encountered during the testing implementation and their solutions.

---

## 🚧 Active Blockers

### 1. EZBill API - Mongoose Global Connection Issue

**Status:** 🔴 BLOCKED
**Phase:** 3.3 (App-Specific Testing)
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

#### Recommended Path Forward

**Short-term (This Week):**
1. Use **Option 2** for immediate testing
2. Create integration tests with real MongoDB
3. Document models work correctly
4. Score: +10 points (40 → 50)

**Long-term (Next Sprint):**
1. Implement **Option 1** (factory pattern)
2. Migrate to mongodb-memory-server
3. Faster tests, better CI/CD
4. Establish pattern for all future models

#### Implementation Plan

**Phase 3.3a - Integration Tests (2-3h):**
- [ ] Setup MongoDB Atlas test cluster
- [ ] Add TEST_MONGO_URL to .env.example
- [ ] Update test-utils to support real MongoDB
- [ ] Write Client model integration tests
- [ ] Write Invoice model integration tests

**Phase 3.3b - Factory Pattern (6-8h):**
- [ ] Refactor ClientModel to factory pattern
- [ ] Refactor InvoiceModel to factory pattern
- [ ] Update all controllers to use factories
- [ ] Migrate tests to mongodb-memory-server
- [ ] Document pattern in DEV-RULES.md

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

---

## ✅ Resolved Blockers

### 1. Tower Defense - Entity Registry Not Seeded

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
