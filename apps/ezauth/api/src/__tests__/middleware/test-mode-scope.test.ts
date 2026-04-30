/**
 * Integration tests for `testModeScopePlugin` (ezauth) — verifies that the
 * Mongoose pre-find hook auto-scopes queries by `req.derivedMode`
 * propagated through `AsyncLocalStorage`.
 *
 * Strategy: spin up an in-memory Mongo via `setupTestDatabase`, seed a few
 * test/live documents on the AuditLog collection (which carries
 * `isTestMode`), then run queries inside a `withRequestContext` frame and
 * verify the scoping.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { withRequestContext } from '@ezstart/api-core'
import { getAuditLogModel, computeAuditLogExpiry } from '../../models/audit-log.js'

async function seedAuditLogs() {
  const AuditLog = await getAuditLogModel()
  // Seed inside the bypass context so the plugin doesn't filter the writes
  // (writes don't go through pre-find hooks anyway, but updateMany would).
  await AuditLog.create([
    {
      userId: 'user-live-1',
      appName: 'ezauth',
      action: 'login',
      metadata: {},
      expiresAt: computeAuditLogExpiry('free'),
      isTestMode: false,
    },
    {
      userId: 'user-live-2',
      appName: 'ezauth',
      action: 'login',
      metadata: {},
      expiresAt: computeAuditLogExpiry('free'),
      isTestMode: false,
    },
    {
      userId: 'user-test-1',
      appName: 'ezauth',
      action: 'login',
      metadata: {},
      expiresAt: computeAuditLogExpiry('free'),
      isTestMode: true,
    },
  ])
}

describe('testModeScopePlugin (ezauth) — AuditLog auto-scoping', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    const AuditLog = await getAuditLogModel()
    await AuditLog.deleteMany({})
    await seedAuditLogs()
  })

  it('returns ALL documents when called outside a request context (no scoping)', async () => {
    const AuditLog = await getAuditLogModel()
    const all = await AuditLog.find({}).lean()
    // 3 docs total — plugin is a no-op without a request frame (cron / migration).
    expect(all).toHaveLength(3)
  })

  it('scopes find() to live docs when derivedMode = live', async () => {
    const AuditLog = await getAuditLogModel()
    await withRequestContext({ derivedMode: 'live' }, async () => {
      const docs = await AuditLog.find({}).lean()
      expect(docs).toHaveLength(2)
      for (const doc of docs) expect(doc.isTestMode).toBe(false)
    })
  })

  it('scopes find() to test docs when derivedMode = test', async () => {
    const AuditLog = await getAuditLogModel()
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const docs = await AuditLog.find({}).lean()
      expect(docs).toHaveLength(1)
      expect(docs[0]?.isTestMode).toBe(true)
    })
  })

  it('scopes findOne() correctly per mode', async () => {
    const AuditLog = await getAuditLogModel()
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const liveDoc = await AuditLog.findOne({ userId: 'user-live-1' }).lean()
      // user-live-1 is isTestMode: false → invisible in test mode.
      expect(liveDoc).toBeNull()

      const testDoc = await AuditLog.findOne({ userId: 'user-test-1' }).lean()
      expect(testDoc?.isTestMode).toBe(true)
    })
  })

  it('scopes countDocuments() per mode', async () => {
    const AuditLog = await getAuditLogModel()
    await withRequestContext({ derivedMode: 'live' }, async () => {
      const count = await AuditLog.countDocuments({})
      expect(count).toBe(2)
    })
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const count = await AuditLog.countDocuments({})
      expect(count).toBe(1)
    })
  })

  it('respects explicit isTestMode in caller filter (no double-injection)', async () => {
    const AuditLog = await getAuditLogModel()
    await withRequestContext({ derivedMode: 'live' }, async () => {
      // Caller is being explicit — they want test docs even from a live ctx.
      // The plugin must respect that and NOT add a conflicting filter.
      const docs = await AuditLog.find({ isTestMode: true }).lean()
      expect(docs).toHaveLength(1)
      expect(docs[0]?.isTestMode).toBe(true)
    })
  })

  it('honours skipTestModeScope: true to bypass the filter', async () => {
    const AuditLog = await getAuditLogModel()
    await withRequestContext({ derivedMode: 'live' }, async () => {
      const docs = await AuditLog.find({}, undefined, { skipTestModeScope: true }).lean()
      expect(docs).toHaveLength(3)
    })
  })

  it('scopes updateMany() per mode (test mode update only touches test docs)', async () => {
    const AuditLog = await getAuditLogModel()
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const res = await AuditLog.updateMany({}, { $set: { 'metadata.touched': true } })
      expect(res.modifiedCount).toBe(1)
    })
    // Verify untouched live docs.
    const liveCount = await AuditLog.countDocuments({ 'metadata.touched': true, isTestMode: false })
    expect(liveCount).toBe(0)
    const testCount = await AuditLog.countDocuments({ 'metadata.touched': true, isTestMode: true })
    expect(testCount).toBe(1)
  })

  it('does NOT scope deleteMany (intentional safety)', async () => {
    const AuditLog = await getAuditLogModel()
    await withRequestContext({ derivedMode: 'test' }, async () => {
      // deleteMany is intentionally NOT auto-scoped so callers must always
      // be explicit. A "wide" delete in test mode would otherwise wipe live
      // data too if the caller forgot the filter — refuse the magic here.
      const res = await AuditLog.deleteMany({})
      expect(res.deletedCount).toBe(3) // all wiped, no scope filter applied
    })
  })

  it('isolates concurrent contexts (no leak between async frames)', async () => {
    const AuditLog = await getAuditLogModel()
    // IMPORTANT: await INSIDE the withRequestContext frame so the
    // AsyncLocalStorage scope spans the full Mongoose query lifecycle. If
    // the callback synchronously returns the Query and we await OUTSIDE
    // the run() call, the pre-find hook may execute after the frame has
    // already closed.
    const [liveCount, testCount] = await Promise.all([
      withRequestContext({ derivedMode: 'live' }, async () => {
        return await AuditLog.countDocuments({})
      }),
      withRequestContext({ derivedMode: 'test' }, async () => {
        return await AuditLog.countDocuments({})
      }),
    ])
    expect(liveCount).toBe(2)
    expect(testCount).toBe(1)
  })
})

describe('testModeScopePlugin (ezauth) — Application auto-scoping', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    const { getApplicationModel } = await import('../../models/application.js')
    const Application = await getApplicationModel()
    await Application.deleteMany({})
    await Application.create([
      {
        slug: 'live-app-1',
        name: 'Live App 1',
        ownerId: 'owner-1',
        themeEnabled: false,
        isPlatformOwned: false,
        requireEmailVerification: false,
        isTestMode: false,
      },
      {
        slug: 'test-app-1',
        name: 'Test App 1',
        ownerId: 'owner-1',
        themeEnabled: false,
        isPlatformOwned: false,
        requireEmailVerification: false,
        isTestMode: true,
      },
    ])
  })

  it('scopes Application.find by mode', async () => {
    const { getApplicationModel } = await import('../../models/application.js')
    const Application = await getApplicationModel()

    await withRequestContext({ derivedMode: 'live' }, async () => {
      const apps = await Application.find({}).lean()
      expect(apps).toHaveLength(1)
      expect(apps[0]?.slug).toBe('live-app-1')
    })

    await withRequestContext({ derivedMode: 'test' }, async () => {
      const apps = await Application.find({}).lean()
      expect(apps).toHaveLength(1)
      expect(apps[0]?.slug).toBe('test-app-1')
    })
  })
})
