import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import type { Model } from 'mongoose'
import {
  getWebhookEventModel,
  ensureWebhookEventIndexes,
  claimWebhookEvent,
  type WebhookEventDocument,
} from '../../models/WebhookEvent.js'

/**
 * MED-1 regression — webhook idempotency depends on the UNIQUE `eventId`
 * index being BUILT before the first webhook is claimed.
 *
 * The previous idempotency test masked the bug by calling
 * `WebhookEventModel.createIndexes()` directly in its setup. That hides the
 * real boot race: in production Mongoose builds indexes lazily/asynchronously
 * and `connectToMongo` has no synchronous `autoIndex` barrier, so the unique
 * index may not exist when the first deliveries arrive.
 *
 * These tests deliberately DROP every collection index first (reproducing the
 * fresh-deploy "no index yet" window) and then exercise idempotency through
 * the BOOT MECHANISM — `ensureWebhookEventIndexes()`, the exact function wired
 * into the `bootApi` `onReady` hook in `index.ts`. No test calls
 * `createIndexes()` directly, so the boot path is the thing under test.
 */
describe('WebhookEvent — boot-time index build (MED-1)', () => {
  let WebhookEvent: Model<WebhookEventDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    WebhookEvent = await getWebhookEventModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await WebhookEvent.deleteMany({})
    // Reset to the fresh-deploy state: drop ALL indexes (except the implicit
    // _id index, which dropIndexes never removes) so the unique `eventId`
    // index does NOT exist until the boot mechanism builds it.
    try {
      await WebhookEvent.collection.dropIndexes()
    } catch {
      // Collection may not exist yet on the very first run — ignore.
    }
  })

  it('builds the unique eventId index so the boot mechanism is idempotent', async () => {
    // Boot step (mirrors index.ts onReady).
    await ensureWebhookEventIndexes()

    const indexes = await WebhookEvent.collection.indexes()
    const eventIdIndex = indexes.find(idx => idx.key?.eventId === 1)

    expect(eventIdIndex, 'unique eventId index must exist after boot').toBeDefined()
    expect(eventIdIndex?.unique).toBe(true)
  })

  it('is idempotent — re-running at boot does not throw', async () => {
    await ensureWebhookEventIndexes()
    // Second boot (e.g. restart / re-deploy) must be a clean no-op.
    await expect(ensureWebhookEventIndexes()).resolves.toBeUndefined()
  })

  it('rejects a duplicate event.id once the boot mechanism has built the index', async () => {
    // 🔒 Build the index via the BOOT mechanism only — never createIndexes().
    await ensureWebhookEventIndexes()

    // First delivery claims the event → side-effects should run.
    const first = await claimWebhookEvent('evt_med1_dup', {
      provider: 'stripe',
      eventType: 'invoice.payment_succeeded',
    })
    // Redelivery of the SAME event.id must lose the claim → no double-credit.
    const second = await claimWebhookEvent('evt_med1_dup', {
      provider: 'stripe',
      eventType: 'invoice.payment_succeeded',
    })

    expect(first).toBe(true)
    expect(second).toBe(false)
    // Exactly one ledger row — the unique index collapsed the duplicate.
    expect(await WebhookEvent.countDocuments({ eventId: 'evt_med1_dup' })).toBe(1)
  })

  it('NEGATIVE CONTROL — without the boot index build, the duplicate slips through', async () => {
    // No ensureWebhookEventIndexes() call here. With no unique index (dropped
    // in beforeEach), BOTH claims succeed → this is the exact double-credit bug
    // MED-1 describes. Proves the test above is NOT masking the failure.
    const first = await claimWebhookEvent('evt_med1_nocontrol', { provider: 'stripe' })
    const second = await claimWebhookEvent('evt_med1_nocontrol', { provider: 'stripe' })

    expect(first).toBe(true)
    // Without the index, the second insert is NOT rejected — both win.
    expect(second).toBe(true)
    expect(await WebhookEvent.countDocuments({ eventId: 'evt_med1_nocontrol' })).toBe(2)
  })
})
