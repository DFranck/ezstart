# @ezbill/test-utils

**EZBill-specific test utilities**

This package provides test factories and helpers specific to the EZBill project. It follows the monorepo hierarchy pattern where project-specific test code is shared between API and Web layers.

---

## 📦 Installation

```bash
# Already installed via workspace
pnpm add -D @ezbill/test-utils
```

---

## 🚀 Quick Start

```typescript
import {
  createTestClient,
  createTestInvoice,
  createPaidInvoice,
  // Re-exports from @ezstart/test-utils
  setupTestDatabase,
  teardownTestDatabase,
  createTestUser,
} from '@ezbill/test-utils'

describe('Invoice Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  it('creates an invoice', async () => {
    const client = createTestClient()
    const invoice = createTestInvoice({ clientId: client._id })

    // Your test logic
    expect(invoice.total).toBe(120)
  })
})
```

---

## 📚 API Reference

### Client Factories

#### `createTestClient(overrides?: Partial<Client>): Client`

Creates a test client with realistic defaults.

**Default values:**
- `_id`: Random ID
- `userId`: Random ID
- `clientName`: `'Test Client Inc.'`
- `email`: `'client@example.com'`
- `phone`: `'+1234567890'`
- `isCompany`: `true`
- `address`: `'123 Test Street'`
- `city`: `'Test City'`
- `postalCode`: `'12345'`
- `country`: `'USA'`
- `companyRegistrationNumber`: `'REG123456'`
- `taxNumber`: `'TAX789'`

**Example:**
```typescript
const client = createTestClient({
  clientName: 'Acme Corp',
  email: 'acme@example.com',
})
```

#### `createTestClients(count: number, overrides?: Partial<Client>): Client[]`

Creates multiple test clients.

**Example:**
```typescript
const clients = createTestClients(5)
// [
//   { clientName: 'Test Client 1', email: 'client1@example.com' },
//   { clientName: 'Test Client 2', email: 'client2@example.com' },
//   ...
// ]
```

---

### Invoice Factories

#### `createTestInvoice(overrides?: Partial<Invoice>): Invoice`

Creates a test invoice with realistic defaults.

**Default values:**
- `_id`: Random ID
- `userId`: Random ID
- `clientId`: Random ID
- `documentNumber`: `'INV-001'`
- `status`: `'draft'`
- `items`: Single item (Test Service, $100)
- `subtotal`: `100`
- `taxAmount`: `20`
- `total`: `120`
- `currency`: `'USD'`
- `dueDate`: 30 days from now
- `exchangeRate`: USD 1:1

**Example:**
```typescript
const invoice = createTestInvoice({
  documentNumber: 'INV-123',
  total: 500,
})
```

#### `createTestInvoices(count: number, overrides?: Partial<Invoice>): Invoice[]`

Creates multiple test invoices with sequential document numbers.

**Example:**
```typescript
const invoices = createTestInvoices(10)
// [
//   { documentNumber: 'INV-001' },
//   { documentNumber: 'INV-002' },
//   ...
//   { documentNumber: 'INV-010' },
// ]
```

#### `createPaidInvoice(overrides?: Partial<Invoice>): Invoice`

Creates a test invoice with `status: 'paid'`.

**Example:**
```typescript
const paidInvoice = createPaidInvoice({ total: 1000 })
expect(paidInvoice.status).toBe('paid')
```

---

## 🧪 Usage Examples

### Unit Test - Invoice Service

```typescript
import { describe, it, expect } from 'vitest'
import { createTestInvoice } from '@ezbill/test-utils'
import { calculateInvoiceTotal } from '../services/invoiceService'

describe('calculateInvoiceTotal', () => {
  it('calculates total with tax', () => {
    const invoice = createTestInvoice({
      subtotal: 100,
      taxAmount: 20,
    })

    const total = calculateInvoiceTotal(invoice)

    expect(total).toBe(120)
  })
})
```

### Integration Test - Invoice API

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestClient,
  createTestInvoice,
} from '@ezbill/test-utils'
import request from 'supertest'
import { app } from '../index'

describe('POST /api/invoices', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  it('creates an invoice', async () => {
    const client = createTestClient()
    const invoice = createTestInvoice({ clientId: client._id })

    const res = await request(app)
      .post('/api/invoices')
      .send(invoice)
      .expect(201)

    expect(res.body.documentNumber).toBe(invoice.documentNumber)
  })
})
```

### E2E Test - Invoice Flow

```typescript
import { test, expect } from '@playwright/test'
import { createTestClient, createTestInvoice } from '@ezbill/test-utils'

test('displays invoice details', async ({ page }) => {
  const client = createTestClient()
  const invoice = createTestInvoice({
    clientId: client._id,
    total: 250,
  })

  // Seed database
  await seedInvoice(invoice)

  await page.goto(`/invoices/${invoice._id}`)

  await expect(page.locator('text=$250.00')).toBeVisible()
  await expect(page.locator(`text=${client.clientName}`)).toBeVisible()
})
```

---

## 📁 File Structure

```
apps/ezbill/test-utils/
├── src/
│   ├── factories/
│   │   ├── client.ts       # Client factories
│   │   └── invoice.ts      # Invoice factories
│   └── index.ts            # Main exports + re-exports
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🎯 Design Principles

### 1. Project-Specific Only

This package contains **only** EZBill-specific test utilities. Generic utilities belong in `@ezstart/test-utils`.

**Examples:**
- ✅ `createTestInvoice()` - EZBill-specific entity
- ✅ `createTestClient()` - EZBill-specific entity
- ❌ `createTestUser()` - Generic (already in @ezstart/test-utils)

### 2. Realistic Test Data

Factories provide realistic defaults that match production data:

```typescript
const invoice = createTestInvoice()
// Has proper exchange rate, valid currency, realistic dates
```

### 3. Type-Safe

All factories return properly typed objects compatible with Zod schemas defined in `@ezbill/types`.

---

## 🔗 Related Packages

- **[@ezstart/test-utils](../../../packages/test-utils/README.md)** - Generic test infrastructure (MongoDB, users)
- **[@ezstart/playwright-config](../../../packages/playwright-config/README.md)** - E2E testing configuration
- **[@ezbill/types](../types/README.md)** - EZBill TypeScript types & schemas

---

## 📦 Used By

- `apps/ezbill/api/src/__tests__` - API unit & integration tests
- `apps/ezbill/web/e2e` - E2E tests

---

## 📝 Notes

- This package re-exports `@ezstart/test-utils` for convenience
- All dates are ISO strings (not Date objects) to match API responses
- IDs use simple random strings (not full MongoDB ObjectIds) for faster tests
- Exchange rates default to 1:1 USD for simplicity

---

**Last Updated:** 2025-10-25
**Version:** 1.0.0
**Maintainer:** EZBill team
