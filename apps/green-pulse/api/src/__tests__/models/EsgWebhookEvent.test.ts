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
  markEsgWebhookEventProcessed,
  releaseEsgWebhookEventClaim,
  ESG_WEBHOOK_STALE_CLAIM_MS,
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

  it('claimEsgWebhookEvent returns "fresh" on first claim, "in-flight" on concurrent unfinished claim (atomic dedup)', async () => {
    await ensureEsgWebhookEventIndexes()

    const first = await claimEsgWebhookEvent('job:job_abc:report.completed', {
      eventType: 'report.completed',
    })
    expect(first).toBe('fresh')

    // Without mark-processed yet, the second claim is in-flight (not duplicate).
    const second = await claimEsgWebhookEvent('job:job_abc:report.completed', {
      eventType: 'report.completed',
    })
    expect(second).toBe('in-flight')
  })

  it('claimEsgWebhookEvent returns "duplicate" after mark-processed (E4 happy path closes window)', async () => {
    await ensureEsgWebhookEventIndexes()

    await claimEsgWebhookEvent('job:job_done:report.completed')
    await markEsgWebhookEventProcessed('job:job_done:report.completed')

    const replay = await claimEsgWebhookEvent('job:job_done:report.completed')
    expect(replay).toBe('duplicate')
  })

  it('claimEsgWebhookEvent returns "recovered" when previous claim is stale (E4 crash recovery)', async () => {
    await ensureEsgWebhookEventIndexes()
    const EsgWebhookEvent = await getEsgWebhookEventModel()

    // Simulate a crashed worker: fresh claim + force `claimedAt` far in the past.
    await claimEsgWebhookEvent('job:job_crashed:report.completed', {
      eventType: 'report.completed',
    })
    const staleClaimedAt = new Date(Date.now() - ESG_WEBHOOK_STALE_CLAIM_MS - 1000)
    await EsgWebhookEvent.updateOne(
      { eventKey: 'job:job_crashed:report.completed' },
      { $set: { claimedAt: staleClaimedAt } }
    )

    const outcome = await claimEsgWebhookEvent('job:job_crashed:report.completed', {
      eventType: 'report.completed',
    })
    expect(outcome).toBe('recovered')

    // Sanity: `claimedAt` was refreshed to ~now (within 5s).
    const row = await EsgWebhookEvent.findOne({
      eventKey: 'job:job_crashed:report.completed',
    }).lean()
    expect(row?.claimedAt).toBeDefined()
    expect(
      Date.now() - (row?.claimedAt instanceof Date ? row.claimedAt.getTime() : 0)
    ).toBeLessThan(5_000)
  })

  it('releaseEsgWebhookEventClaim allows immediate re-claim by stamping epoch (E4 dispatch-fail recovery)', async () => {
    await ensureEsgWebhookEventIndexes()

    await claimEsgWebhookEvent('job:job_released:report.completed')
    await releaseEsgWebhookEventClaim('job:job_released:report.completed')

    // Next claim sees a stale (epoch) claim → recovered.
    const outcome = await claimEsgWebhookEvent('job:job_released:report.completed')
    expect(outcome).toBe('recovered')
  })

  it('releaseEsgWebhookEventClaim is a no-op when the event has already been marked processed', async () => {
    await ensureEsgWebhookEventIndexes()
    const EsgWebhookEvent = await getEsgWebhookEventModel()

    await claimEsgWebhookEvent('job:job_already_done:report.completed')
    await markEsgWebhookEventProcessed('job:job_already_done:report.completed')

    // Release is called after a late dispatch error — must NOT clobber
    // the `processedAt` we already set (would re-open the duplicate gate).
    const beforeProcessed = await EsgWebhookEvent.findOne({
      eventKey: 'job:job_already_done:report.completed',
    }).lean()
    await releaseEsgWebhookEventClaim('job:job_already_done:report.completed')
    const afterProcessed = await EsgWebhookEvent.findOne({
      eventKey: 'job:job_already_done:report.completed',
    }).lean()

    expect(afterProcessed?.processedAt?.toISOString()).toBe(
      beforeProcessed?.processedAt?.toISOString()
    )
    // Replay after the late release is still a duplicate (window stays closed).
    expect(await claimEsgWebhookEvent('job:job_already_done:report.completed')).toBe('duplicate')
  })

  it('treats different event types of the same job as distinct claims (key includes type)', async () => {
    // The handler builds keys as `job:<id>:<type>` so a `report.completed`
    // and a later `data.processed` for the same job both process — but each
    // is dedup'd against future replays of itself.
    await ensureEsgWebhookEventIndexes()

    expect(await claimEsgWebhookEvent('job:job_xyz:report.completed')).toBe('fresh')
    expect(await claimEsgWebhookEvent('job:job_xyz:data.processed')).toBe('fresh')
    // Mark them processed so the "replay" claim sees the duplicate state.
    await markEsgWebhookEventProcessed('job:job_xyz:report.completed')
    await markEsgWebhookEventProcessed('job:job_xyz:data.processed')
    // Replay of the first one is now a duplicate.
    expect(await claimEsgWebhookEvent('job:job_xyz:report.completed')).toBe('duplicate')
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
