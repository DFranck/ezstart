# 🧪 Testing Strategy - @ezstart Monorepo

**Philosophy:** Follow existing monorepo hierarchy - Don't over-engineer

**Status:** Phase 3 - Score Tests: 100/100 ✅ (340 tests, 100% pass)

---

## 🎯 Architecture

### Follow Existing Pattern

**DON'T:** Create 3 new packages (`test-utils`, `api-test-utils`, `e2e-utils`)
**DO:** Follow the existing hierarchy like `types/`, `config/`, `utils/`

```
@ezstart/
├── packages/
│   └── test-utils/              # Cross-project test infrastructure
│       ├── vitest.config.ts     # Centralized Vitest config
│       ├── createVitestConfig.ts # Factory function (CRITICAL)
│       ├── mongodb.ts           # MongoDB Memory Server
│       └── factories/
│           └── user.ts          # createTestUser()
│
└── apps/
    ├── ezbill/
    │   ├── test-utils/          # EZBill-specific
    │   │   ├── factories/
    │   │   │   ├── invoice.ts
    │   │   │   └── client.ts
    │   │   └── mocks/
    │   │       └── stripe.ts
    │   ├── api/
    │   │   └── src/__tests__/   # Unit + Integration
    │   └── web/
    │       └── e2e/             # E2E tests
```

---

## ✅ Current Status (26/10/2025)

### Tests Infrastructure

**Protection Multi-Niveaux :**
1. ✅ `createVitestConfig({ dbName })` - Factory function centralisée
2. ✅ `NODE_ENV=test` forcé dans tous les tests
3. ✅ `MONGO_URL` fallback localhost (JAMAIS production)
4. ✅ `.env.test` optionnel chargé automatiquement

**APIs Protégés (6/6) :**
- ✅ EZAuth: `createVitestConfig({ dbName: 'ezauth' })`
- ✅ EZBill: `createVitestConfig({ dbName: 'ezbilling' })`
- ✅ EZPay: `createVitestConfig({ dbName: 'ezpay' })`
- ✅ Tower Defense: `createVitestConfig({ dbName: 'tower-defense' })`
- ✅ GreenPulse: `createVitestConfig({ dbName: 'green-pulse' })`
- ✅ Monitoring: `createVitestConfig({ dbName: 'ezstart-monitoring' })`

### Test Results

```
Total: 340 tests
Pass: 340 ✅
Fail: 0
Coverage: DB protection 100%
```

---

## 🚀 Running Tests

### All Tests
```bash
pnpm test
```

### Specific Package
```bash
pnpm --filter api-ezauth test
pnpm --filter @ezstart/config test
```

### With Coverage
```bash
pnpm test -- --coverage
```

### Watch Mode
```bash
pnpm --filter api-ezauth test:watch
```

---

## 📝 Writing Tests

### Standard Pattern

```typescript
// apps/ezbill/api/src/services/__tests__/invoice.service.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createTestInvoice } from '../../../test-utils/factories/invoice'
import { InvoiceService } from '../invoice.service'

describe('InvoiceService', () => {
  it('calculates total correctly', () => {
    const invoice = createTestInvoice({
      items: [
        { quantity: 2, price: 10 },
        { quantity: 1, price: 5 },
      ],
    })

    const total = InvoiceService.calculateTotal(invoice)
    expect(total).toBe(25)
  })
})
```

### Database Tests

```typescript
import { getInvoiceModel } from '../models/Invoice'

describe('Invoice Model', () => {
  it('creates invoice in test DB', async () => {
    const Invoice = await getInvoiceModel()
    const invoice = await Invoice.create({
      clientId: 'test-client',
      total: 100
    })

    expect(invoice._id).toBeDefined()
  })
})
```

---

## ⚠️ Critical Rules

### Database Protection

❌ **INTERDICTIONS ABSOLUES**
1. **JAMAIS** créer vitest.config.ts sans `createVitestConfig()`
2. **JAMAIS** utiliser `.env.local` pour tests
3. **JAMAIS** hardcoder `MONGO_URL` production dans test config
4. **JAMAIS** lancer `pnpm test` sans vérifier environnement

✅ **OBLIGATIONS ABSOLUES**
1. **TOUJOURS** utiliser `createVitestConfig({ dbName })`
2. **TOUJOURS** vérifier `NODE_ENV=test`
3. **TOUJOURS** tester avec MongoMemoryServer ou localhost
4. **TOUJOURS** faire backups hebdomadaires

### Example Config

```typescript
// apps/[api]/vitest.config.ts
import { createVitestConfig } from '@ezstart/test-utils'

export default createVitestConfig({
  dbName: 'ezauth', // Database name for isolation
})
```

---

## 🎯 Phase 3 Roadmap (Completed 100/100)

### Achievements

- ✅ **Infrastructure** (12h) - `@ezstart/test-utils` + factory pattern
- ✅ **Unit Tests** (20h) - Business logic EZAuth, EZBill, EZPay
- ✅ **Integration Tests** (20h) - API routes
- ✅ **Database Protection** (4h) - Triple-level protection
- ✅ **CI/CD** (8h) - GitHub Actions

### Stats

**Before:** 15/100 ⚠️ Poor
**After:** 100/100 ⭐⭐⭐⭐⭐ Excellent
**Improvement:** +85 points

---

## 📚 Documentation

- **Test Utils Package:** [packages/test-utils/README.md](../packages/test-utils/README.md)
- **Factory Pattern:** [packages/test-utils/src/createVitestConfig.ts](../packages/test-utils/src/createVitestConfig.ts)
- **MongoDB Setup:** [packages/express-core/MONGODB-ARCHITECTURE.md](../packages/express-core/MONGODB-ARCHITECTURE.md)
- **Dev Rules:** [DEV-RULES.md](../DEV-RULES.md)

---

## 🐛 Troubleshooting

### Tests Fail with "Connection Timeout"

**Cause:** MongoMemoryServer failed to start
**Solution:** Check logs, fallback uses `localhost:27017/${dbName}-test`

### Tests Touch Production

**Cause:** Missing `createVitestConfig()` or wrong env vars
**Solution:**
1. Use `createVitestConfig({ dbName })`
2. Verify `NODE_ENV=test` in logs
3. Check MONGO_URL doesn't point to production

### Slow Tests

**Cause:** Database not cleaned between tests
**Solution:** Use `beforeEach(() => Model.deleteMany({}))`

---

## ✅ Validation Checklist

Before deploying tests:

```bash
# 1. Verify test isolation
pnpm test 2>&1 | grep "NODE_ENV=test"

# 2. Check no production URLs
pnpm test 2>&1 | grep -i "mongodb.net" && echo "ERROR: Production DB!" || echo "OK"

# 3. Run all tests
pnpm test

# 4. Verify pass rate
# Should be 340/340 or 100%
```
