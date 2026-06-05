/**
 * Idempotency guard tests for `EsgWebhookEvent` (hacker A1b — E2).
 *
 * Verifies that:
 *   1. `ensureEsgWebhookEventIndexes` builds the unique `eventKey` index so
 *      the boot path closes the lazy-index race window before traffic is
 *      accepted.
 *   2. `claimEsgWebhookEvent` returns `true` on the first claim and `false`
 *      on every subsequent claim of the same key — the atomic insert +
 *      E11000 catch is the dedup primitive.
 *   3. The boot mechanism is idempotent (re-running on restart is a no-op).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import type { Model } from 'mongoose'
import {
  getEsgWebhookEventModel,
  ensureEsgWebhookEventIndexes,
  claimEsgWebhookEvent,
  type EsgWebhookEventDocument,
} from '../../models/EsgWebhookEvent.js'

describe('EsgWebhookEvent — boot-time index build + idempotency claim (E2)', () => {
  let EsgWebhookEvent: Model<EsgWebhookEventDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    EsgWebhookEvent = await getEsgWebhookEventModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await EsgWebhookEvent.deleteMany({})
    // Reset to a fresh-deploy state: drop all indexes (except `_id`) so the
    // unique `eventKey` index does NOT exist until the boot mechanism
    // explicitly builds it.
    try {
      await EsgWebhookEvent.collection.dropIndexes()
    } catch {
      // Collection may not exist on the very first run — ignore.
    }
  })

  it('builds the unique `eventKey` index after the boot mechanism runs', async () => {
    await ensureEsgWebhookEventIndexes()

    const indexes = await EsgWebhookEvent.collection.indexes()
    const uniqueIndex = indexes.find(idx => idx.key?.eventKey === 1)

    expect(uniqueIndex, 'unique `eventKey` index must exist after boot').toBeDefined()
    expect(uniqueIndex?.unique).toBe(true)
  })

  it('is idempotent — re-running at boot is a no-op (restart safe)', async () => {
    await ensureEsgWebhookEventIndexes()
    await expect(ensureEsgWebhookEventIndexes()).resolves.toBeUndefined()
  })

  it('claimEsgWebhookEvent returns true on first claim, false on second (atomic dedup)', async () => {
    await ensureEsgWebhookEventIndexes()

    const first = await claimEsgWebhookEvent('job:job_abc:report.completed', {
      eventType: 'report.completed',
    })
    expect(first).toBe(true)

    const second = await claimEsgWebhookEvent('job:job_abc:report.completed', {
      eventType: 'report.completed',
    })
    expect(second).toBe(false)
  })

  it('treats different event types of the same job as distinct claims (key includes type)', async () => {
    // The handler builds keys as `job:<id>:<type>` so a `report.completed`
    // and a later `data.processed` for the same job both process — but each
    // is dedup'd against future replays of itself.
    await ensureEsgWebhookEventIndexes()

    expect(await claimEsgWebhookEvent('job:job_xyz:report.completed')).toBe(true)
    expect(await claimEsgWebhookEvent('job:job_xyz:data.processed')).toBe(true)
    // Replay of the first one is now a no-op.
    expect(await claimEsgWebhookEvent('job:job_xyz:report.completed')).toBe(false)
  })

  it('propagates non-duplicate errors (the caller decides whether to ack)', async () => {
    await ensureEsgWebhookEventIndexes()

    // Force a non-E11000 failure by passing an excessively-long key that
    // violates Mongo's BSON document size or — simpler — pass an obviously
    // invalid type. Easiest path: pass an empty string which fails Schema
    // `required` validation before the insert hits the index.
    await expect(claimEsgWebhookEvent('')).rejects.toBeDefined()
  })
})
