# 🚀 Next Session - Quick Start Guide

**Last Session:** Phase 3.3 Complete (EZBill API testing)
**Current Score:** 70/100 testing, 79.2/100 global
**Target Score:** 80/100 testing (only 10 points away!)

---

## ⚡ Quick Context

### What Was Done (Phase 3.3)

✅ **EZBill API fully tested** - 67 tests passing
✅ **Factory pattern migration** - 4 models + 34+ functions refactored
✅ **MongoDB blocker resolved** - All future APIs can now be tested
✅ **Score +30 points** - 40/100 → 70/100 (+75%)

### Current State

- **217 tests passing** (100% success rate)
- **5/18 packages tested** (28% coverage)
- **88% to target** (70/80 points achieved)
- **ROI: 6.9 pts/hour** (8x better than estimate)

---

## 🎯 Next Mission: Phase 3.4

### Goal: Reach 80/100 Target Score

**Recommended:** Test both EZAuth and EZPay APIs

### Option A: EZAuth API (~6h)

**Models to test:**
- User model (auth_users collection)
- AuthCode model (auth_codes collection)

**Test scenarios:**
- SSO flow: register → login → token exchange → verify
- Token validation and expiry
- OAuth2 authorization code flow
- Session management

**Expected:** +5 points (75/100)

### Option B: EZPay API (~6h)

**Models to test:**
- Payment model

**Test scenarios:**
- Donation flow (create → stripe checkout → webhook → complete)
- Purchase flow (same as donation but with product metadata)
- Stripe webhook handling (mocked)
- Payment status tracking

**Expected:** +5 points (75/100)

### Recommended: Both APIs (~12h)

Complete both EZAuth and EZPay to reach 80/100 target score.

**Expected:** +10 points (80/100) ✅ **TARGET REACHED**

---

## 📝 Pattern to Follow

### Factory Pattern (CRITICAL)

All EZAuth and EZPay models already use factory pattern:

```typescript
// ✅ EZAuth already has this pattern
export async function getAuthUserModel() {
  const mongoose = await connectToMongo('ezauth')
  return mongoose.models.AuthUser || mongoose.model('AuthUser', authUserSchema)
}

// ✅ EZPay already has this pattern (check first)
// If NOT, copy from EZAuth/EZBill
```

**Action:** Verify both APIs have factory pattern before starting tests.

### Test Structure (Copy from EZBill)

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getModelName } from '../../models/model.js'

describe('Model Name', () => {
  let Model: Model<DocumentType>

  beforeAll(async () => {
    await setupTestDatabase()
    Model = await getModelName()

    // Drop and recreate indexes
    try {
      await Model.collection.dropIndexes()
    } catch (error) {
      // Ignore
    }
    await Model.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Model.deleteMany({})
  })

  describe('Schema Validation', () => {
    it('should create valid document with required fields', async () => {
      const doc = await Model.create({ ... })
      expect(doc).toBeDefined()
    })
  })

  // ... more test categories
})
```

---

## 🔍 Pre-Flight Checks

### Before Starting EZAuth Tests

1. ✅ Check if models use factory pattern
   - File: `apps/ezauth/api/src/models/`
   - Look for: `export async function getAuthUserModel()`
   - If NOT found: Refactor first (copy pattern from EZBill)

2. ✅ Check database connection
   - File: `apps/ezauth/api/src/index.ts`
   - Look for: `connectToMongo('ezauth')`
   - Should already be there

3. ✅ Verify vitest setup
   - File: `apps/ezauth/api/vitest.config.ts`
   - Should exist (standardized in Phase 3.2)

4. ✅ Check .env.local has MONGO_URL
   - Not needed for tests (uses memory server)
   - But good to verify for dev environment

### Before Starting EZPay Tests

Same checks as EZAuth but for:
- `apps/ezpay/api/src/models/`
- `connectToMongo('ezpay')`
- `apps/ezpay/api/vitest.config.ts`

---

## 📚 Helpful References

### Documentation
- [PHASE-3-OVERVIEW.md](./PHASE-3-OVERVIEW.md) - Complete Phase 3 summary
- [PHASE-3.3-SUMMARY.md](./PHASE-3.3-SUMMARY.md) - EZBill testing details
- [TESTING-MISSION.md](./TESTING-MISSION.md) - Detailed mission report
- [TESTING-AUDIT.md](./audits/TESTING-AUDIT.md) - Current testing state

### Code References
- [apps/ezbill/api/src/__tests__/models/](../apps/ezbill/api/src/__tests__/models/) - Test examples
- [apps/ezbill/api/src/models/](../apps/ezbill/api/src/models/) - Factory pattern examples
- [packages/test-utils/](../packages/test-utils/) - Test utilities

### Key Learnings
- Always use factory pattern for MongoDB models
- Drop and recreate indexes in beforeAll
- Read type definitions before writing tests
- Use automation (Python scripts) for bulk refactors
- Copy working examples instead of inventing new patterns

---

## ⚠️ Common Pitfalls to Avoid

1. **Don't use global model exports**
   - ❌ `export const Model = model('Model', schema)`
   - ✅ `export async function getModel() { ... }`

2. **Don't forget to drop indexes**
   - Old indexes cause E11000 errors
   - Always drop + recreate in beforeAll

3. **Don't assume field names**
   - Read type definitions first
   - Example: `label` not `description` for line items

4. **Don't manually update 30+ functions**
   - Use Python script for bulk changes
   - Saves time and prevents typos

5. **Don't skip database cleanup**
   - Always `deleteMany({})` in beforeEach
   - Prevents test interference

---

## 🎯 Success Criteria

### Phase 3.4 Complete When:

- ✅ EZAuth User model tests passing
- ✅ EZAuth AuthCode model tests passing
- ✅ EZPay Payment model tests passing
- ✅ All service functions updated (if needed)
- ✅ Testing score reaches 80/100
- ✅ Documentation updated (TESTING-AUDIT.md, TESTING-MISSION.md, README.md)

### Expected Metrics:

- **Tests written:** 50-70 (EZAuth 20-30, EZPay 30-40)
- **Total tests:** 217 → 267-287
- **Score:** 70/100 → 80/100 (+10 points)
- **Time:** 8-12 hours (with potential blockers)
- **ROI target:** 5+ pts/hour

---

## 🚀 How to Start

### Step 1: Check EZAuth Factory Pattern

```bash
# Read the User model
cat apps/ezauth/api/src/models/auth/user.ts

# Look for:
# export async function getAuthUserModel()

# If NOT found, refactor is needed first
```

### Step 2: Create Test File

```bash
# Create test directory
mkdir -p apps/ezauth/api/src/__tests__/models

# Create test file
touch apps/ezauth/api/src/__tests__/models/User.test.ts
```

### Step 3: Copy Template from EZBill

```bash
# Copy Client.test.ts as template
cp apps/ezbill/api/src/__tests__/models/Client.test.ts \
   apps/ezauth/api/src/__tests__/models/User.test.ts

# Modify for User model
```

### Step 4: Run Tests

```bash
cd apps/ezauth/api
pnpm test
```

### Step 5: Repeat for AuthCode

Same process for AuthCode model.

### Step 6: Move to EZPay

Repeat Steps 1-5 for EZPay Payment model.

---

## 📊 Expected Timeline

**Optimistic (8h):**
- EZAuth: 4h
- EZPay: 4h
- Documentation: Included

**Realistic (12h):**
- EZAuth: 6h (potential refactor if no factory pattern)
- EZPay: 5h (Stripe webhook mocking complexity)
- Documentation: 1h

**Pessimistic (16h):**
- EZAuth: 8h (full refactor needed)
- EZPay: 7h (complex payment flows)
- Documentation: 1h

**Target:** Realistic scenario (12h)

---

## 🎖️ Mission Status

**Current Phase:** 3.3 COMPLETE ✅
**Next Phase:** 3.4 (EZAuth + EZPay)
**Target:** 80/100 testing score
**Progress:** 88% to target

**You Got This! 🚀**

---

**Last Updated:** 2025-10-25
**Next Session:** Phase 3.4 - EZAuth + EZPay APIs
