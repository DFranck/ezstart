# @ezstart/test-utils

**Generic test infrastructure for @ezstart monorepo**

This package provides reusable test utilities, factories, and helpers for all projects in the monorepo. Following the "single source of truth" principle, any test utility used by 2+ projects should be centralized here.

---

## 📦 Installation

```bash
# Already installed via workspace
pnpm add -D @ezstart/test-utils
```

---

## 🚀 Quick Start

### MongoDB Memory Server

```typescript
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from '@ezstart/test-utils'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'

describe('My API Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanDatabase() // Clean between tests
  })

  it('should create a user', async () => {
    // Your test here with real MongoDB in-memory
  })
})
```

### Test Factories

```typescript
import { createTestUser, createTestUsers } from '@ezstart/test-utils'

// Single user
const user = createTestUser()
// { _id: '...', email: 'test@example.com', name: 'Test User', ... }

// Multiple users
const users = createTestUsers(5)
// [{ email: 'test1@example.com' }, { email: 'test2@example.com' }, ...]

// With overrides
const admin = createTestUser({ name: 'Admin User', email: 'admin@example.com' })
```

### Seed Helpers

```typescript
import { seedCollection, countDocuments } from '@ezstart/test-utils'

// Seed a collection
await seedCollection('users', [
  { email: 'user1@example.com', name: 'User 1' },
  { email: 'user2@example.com', name: 'User 2' },
])

// Count documents
const count = await countDocuments('users')
expect(count).toBe(2)
```

---

## 📚 API Reference

### MongoDB Setup

#### `setupTestDatabase(): Promise<string>`

Creates an in-memory MongoDB instance for isolated tests.

- **Returns**: MongoDB URI string
- **Throws**: Error if database already running
- **Usage**: Call once in `beforeAll()`

```typescript
const uri = await setupTestDatabase()
// mongodb://127.0.0.1:12345/test
```

#### `teardownTestDatabase(): Promise<void>`

Stops the MongoDB Memory Server and closes all connections.

- **Usage**: Call once in `afterAll()`
- **Safe**: Does nothing if no server running

```typescript
await teardownTestDatabase()
```

#### `cleanDatabase(): Promise<void>`

Deletes all documents from all collections.

- **Usage**: Call in `beforeEach()` for isolated tests
- **Throws**: Error if MongoDB not connected

```typescript
await cleanDatabase()
```

#### `getTestDatabaseUri(): string`

Returns the current test database URI.

- **Throws**: Error if database not initialized

---

### Factories

#### `createTestUser(overrides?: Partial<TestUser>): TestUser`

Creates a test user with sensible defaults.

**Default values:**
- `_id`: Random ObjectId
- `email`: `'test@example.com'`
- `name`: `'Test User'`
- `createdAt`: Current timestamp
- `updatedAt`: Current timestamp

**Example:**
```typescript
const user = createTestUser({ email: 'custom@example.com' })
```

#### `createTestUsers(count: number, overrides?: Partial<TestUser>): TestUser[]`

Creates multiple test users.

**Example:**
```typescript
const users = createTestUsers(10, { name: 'Bulk User' })
// [{ email: 'test1@example.com' }, ..., { email: 'test10@example.com' }]
```

---

### Helpers

#### `seedCollection<T>(collectionName: string, data: T[]): Promise<void>`

Seeds a MongoDB collection with test data.

**Example:**
```typescript
await seedCollection('products', [
  { name: 'Product 1', price: 100 },
  { name: 'Product 2', price: 200 },
])
```

#### `countDocuments(collectionName: string): Promise<number>`

Counts documents in a collection.

**Example:**
```typescript
const count = await countDocuments('products')
expect(count).toBe(2)
```

---

## 🔧 Configuration

### Vitest Config

The package includes a base Vitest configuration:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000, // 10s for MongoDB operations
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

**Usage in your package:**
```typescript
// apps/[project]/api/vitest.config.ts
import baseConfig from '@ezstart/test-utils/vitest.config'
import { mergeConfig } from 'vitest/config'

export default mergeConfig(baseConfig, {
  test: {
    // Your custom config
  },
})
```

---

## 📁 File Structure

```
packages/test-utils/
├── src/
│   ├── mongodb.ts          # MongoDB Memory Server setup
│   ├── factories/
│   │   └── user.ts         # createTestUser()
│   ├── helpers/
│   │   └── seed.ts         # seedCollection(), countDocuments()
│   └── index.ts            # Main exports
├── vitest.config.ts        # Base Vitest config
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🎯 Design Principles

### 1. Generic & Reusable

Only include utilities used by **2+ projects**. Project-specific factories belong in `apps/[project]/test-utils`.

**Example:**
- ✅ `createTestUser()` - Used by EZAuth, EZBill, EZPay (generic)
- ❌ `createTestInvoice()` - Only EZBill (goes in `apps/ezbill/test-utils`)

### 2. Type-Safe

All factories return properly typed objects compatible with Zod schemas.

```typescript
const user = createTestUser()
// Type: TestUser (compatible with User schema)
```

### 3. Sensible Defaults

Factories provide realistic default values so tests are readable:

```typescript
// ✅ Clear and concise
const user = createTestUser()

// ❌ Verbose
const user = {
  _id: new ObjectId().toString(),
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date(),
  updatedAt: new Date(),
}
```

---

## 🧪 Testing This Package

```bash
cd packages/test-utils
pnpm test
```

---

## 📦 Used By

- `@ezstart/express-core` - API infrastructure tests
- `@ezstart/auth-sdk` - Authentication tests
- `apps/ezbill/api` - EZBill API tests
- `apps/ezauth/api` - EZAuth API tests
- `apps/ezpay/api` - EZPay API tests

---

## 🔗 Related Packages

- **[@ezstart/playwright-config](../playwright-config/README.md)** - E2E testing configuration
- **[@ezbill/test-utils](../../apps/ezbill/test-utils/README.md)** - EZBill-specific test utilities

---

## 📝 Notes

- MongoDB Memory Server downloads MongoDB binaries on first install (~300MB)
- Tests run against a real MongoDB instance (not mocked)
- Each test file gets isolated database state
- Memory Server runs on random port to avoid conflicts

---

**Last Updated:** 2025-10-25
**Version:** 1.0.0
**Maintainer:** @ezstart monorepo team
