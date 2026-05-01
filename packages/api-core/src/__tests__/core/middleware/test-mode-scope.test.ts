/**
 * Integration tests for `testModeScopePlugin` (api-core agnostic primitive).
 *
 * Verifies the Mongoose pre-find hook auto-scopes queries by `derivedMode`
 * propagated through `AsyncLocalStorage`. Mirrors the contract previously
 * verified by the per-app twin tests in ezauth/ezpay — the plugin behaviour
 * is agnostic, so we cover it once here against a synthetic in-test schema
 * (no app-specific model coupling).
 *
 * Strategy: spin up an in-memory Mongo via `@ezstart/test-utils`, register a
 * synthetic `Widget` collection that carries `isTestMode`, seed a few
 * test/live/legacy documents, then run queries inside `withRequestContext`
 * frames and verify the scoping.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import mongoose, { Schema, type Model } from 'mongoose'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'

import { withRequestContext } from '../../../core/context/request-context.js'
import { testModeScopePlugin } from '../../../core/middleware/test-mode-scope.js'

/* -------------------------------------------------------------------------- */
/* Test schema fixtures                                                       */
/* -------------------------------------------------------------------------- */

interface WidgetDoc {
  name: string
  applicationId?: string
  isTestMode?: boolean
}

let WidgetModel: Model<WidgetDoc>

function buildWidgetModel(): Model<WidgetDoc> {
  const schema = new Schema<WidgetDoc>(
    {
      name: { type: String, required: true },
      applicationId: { type: String },
      isTestMode: { type: Boolean, default: false },
    },
    { bufferCommands: false }
  )
  schema.plugin(testModeScopePlugin)
  return mongoose.models.Widget ?? mongoose.model<WidgetDoc>('Widget', schema)
}

/** Schema WITHOUT an `isTestMode` path — plugin must be a no-op. */
interface PlainDoc {
  label: string
}
let PlainModel: Model<PlainDoc>

function buildPlainModel(): Model<PlainDoc> {
  const schema = new Schema<PlainDoc>(
    { label: { type: String, required: true } },
    { bufferCommands: false }
  )
  schema.plugin(testModeScopePlugin) // must no-op since no isTestMode path
  return mongoose.models.Plain ?? mongoose.model<PlainDoc>('Plain', schema)
}

async function seedWidgets() {
  await WidgetModel.create([
    { name: 'live-1', applicationId: 'app-a', isTestMode: false },
    { name: 'live-2', applicationId: 'app-a', isTestMode: false },
    { name: 'test-1', applicationId: 'app-a', isTestMode: true },
  ])
}

/* -------------------------------------------------------------------------- */
/* Suites                                                                     */
/* -------------------------------------------------------------------------- */

describe('testModeScopePlugin — auto-scoping by derivedMode', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    WidgetModel = buildWidgetModel()
    PlainModel = buildPlainModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await WidgetModel.deleteMany({})
    await seedWidgets()
  })

  it('returns ALL documents when called outside a request context (no scoping)', async () => {
    const all = await WidgetModel.find({}).lean()
    expect(all).toHaveLength(3)
  })

  it('scopes find() to live docs when derivedMode = live', async () => {
    await withRequestContext({ derivedMode: 'live' }, async () => {
      const docs = await WidgetModel.find({}).lean()
      expect(docs).toHaveLength(2)
      for (const doc of docs) expect(doc.isTestMode).toBe(false)
    })
  })

  it('scopes find() to test docs when derivedMode = test (strict)', async () => {
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const docs = await WidgetModel.find({}).lean()
      expect(docs).toHaveLength(1)
      expect(docs[0]?.isTestMode).toBe(true)
    })
  })

  it('scopes findOne() correctly per mode', async () => {
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const liveDoc = await WidgetModel.findOne({ name: 'live-1' }).lean()
      // live-1 is isTestMode: false → invisible in test mode.
      expect(liveDoc).toBeNull()

      const testDoc = await WidgetModel.findOne({ name: 'test-1' }).lean()
      expect(testDoc?.isTestMode).toBe(true)
    })
  })

  it('scopes countDocuments() per mode', async () => {
    await withRequestContext({ derivedMode: 'live' }, async () => {
      expect(await WidgetModel.countDocuments({})).toBe(2)
    })
    await withRequestContext({ derivedMode: 'test' }, async () => {
      expect(await WidgetModel.countDocuments({})).toBe(1)
    })
  })

  it('scopes distinct() per mode', async () => {
    await withRequestContext({ derivedMode: 'live' }, async () => {
      const names = await WidgetModel.distinct('name')
      expect(names.sort()).toEqual(['live-1', 'live-2'])
    })
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const names = await WidgetModel.distinct('name')
      expect(names).toEqual(['test-1'])
    })
  })

  it('scopes findOneAndUpdate() per mode (test mode cannot touch live docs)', async () => {
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const updated = await WidgetModel.findOneAndUpdate(
        { name: 'live-1' },
        { $set: { applicationId: 'tampered' } },
        { new: true }
      ).lean()
      // live-1 invisible from test ctx → no doc updated.
      expect(updated).toBeNull()
    })
    // Verify untouched.
    const liveDoc = await WidgetModel.findOne({ name: 'live-1' }).lean()
    expect(liveDoc?.applicationId).toBe('app-a')
  })

  it('respects explicit isTestMode in caller filter (no double-injection)', async () => {
    await withRequestContext({ derivedMode: 'live' }, async () => {
      // Caller is being explicit — they want test docs even from a live ctx.
      // Plugin must respect that and NOT add a conflicting filter.
      const docs = await WidgetModel.find({ isTestMode: true }).lean()
      expect(docs).toHaveLength(1)
      expect(docs[0]?.isTestMode).toBe(true)
    })
  })

  it('respects explicit isTestMode nested in $or / $and (no double-injection)', async () => {
    await withRequestContext({ derivedMode: 'live' }, async () => {
      const docs = await WidgetModel.find({
        $or: [{ isTestMode: true }, { name: 'live-1' }],
      }).lean()
      // Plugin sees explicit isTestMode in the $or → leaves filter alone.
      // Result = test-1 (isTestMode true) + live-1 (matches name).
      const names = docs.map(d => d.name).sort()
      expect(names).toEqual(['live-1', 'test-1'])
    })
  })

  it('honours skipTestModeScope: true to bypass the filter', async () => {
    await withRequestContext({ derivedMode: 'live' }, async () => {
      const docs = await WidgetModel.find({}, undefined, { skipTestModeScope: true }).lean()
      expect(docs).toHaveLength(3)
    })
  })

  it('scopes updateMany() per mode (test mode update only touches test docs)', async () => {
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const res = await WidgetModel.updateMany({}, { $set: { applicationId: 'touched' } })
      expect(res.modifiedCount).toBe(1)
    })
    // Verify untouched live docs.
    const liveTouched = await WidgetModel.countDocuments({
      applicationId: 'touched',
      isTestMode: false,
    })
    expect(liveTouched).toBe(0)
    const testTouched = await WidgetModel.countDocuments({
      applicationId: 'touched',
      isTestMode: true,
    })
    expect(testTouched).toBe(1)
  })

  it('does NOT scope deleteMany (intentional safety)', async () => {
    await withRequestContext({ derivedMode: 'test' }, async () => {
      // deleteMany is intentionally NOT auto-scoped — see plugin module docstring.
      const res = await WidgetModel.deleteMany({})
      expect(res.deletedCount).toBe(3) // all wiped, no scope filter applied
    })
  })

  it('isolates concurrent contexts (no leak between async frames)', async () => {
    const [liveCount, testCount] = await Promise.all([
      withRequestContext({ derivedMode: 'live' }, async () => {
        return await WidgetModel.countDocuments({})
      }),
      withRequestContext({ derivedMode: 'test' }, async () => {
        return await WidgetModel.countDocuments({})
      }),
    ])
    expect(liveCount).toBe(2)
    expect(testCount).toBe(1)
  })
})

describe('testModeScopePlugin — backward compat with pre-V2 docs (no isTestMode field)', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    WidgetModel = buildWidgetModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await WidgetModel.deleteMany({})

    // Mongoose-mediated docs (schema default fills isTestMode).
    await WidgetModel.create([
      { name: 'post-v2-live', isTestMode: false },
      { name: 'post-v2-test', isTestMode: true },
    ])

    // Raw driver insert — bypass schema defaults, leave isTestMode undefined.
    // Mirrors the state of any prod doc that predates the V2 migration.
    await WidgetModel.collection.insertOne({
      name: 'pre-v2-legacy',
      // Intentionally NO `isTestMode` field — that's the whole point.
    })
  })

  it('live mode includes docs with isTestMode=undefined (backward compat for pre-V2 data)', async () => {
    await withRequestContext({ derivedMode: 'live' }, async () => {
      const docs = await WidgetModel.find({}).lean()
      const names = docs.map(d => d.name).sort()
      // Both `post-v2-live` (isTestMode=false) AND `pre-v2-legacy` (no field)
      // must surface — the legacy doc would otherwise vanish in dev/prod
      // until the migration runs.
      expect(names).toEqual(['post-v2-live', 'pre-v2-legacy'])
    })
  })

  it('live mode excludes docs with isTestMode=true (existing behavior unchanged)', async () => {
    await withRequestContext({ derivedMode: 'live' }, async () => {
      const testDoc = await WidgetModel.findOne({ name: 'post-v2-test' }).lean()
      // Test doc invisible from live ctx — strict.
      expect(testDoc).toBeNull()
    })
  })

  it('test mode includes docs with isTestMode=true ONLY (excludes undefined and false — strict opt-in)', async () => {
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const docs = await WidgetModel.find({}).lean()
      // Only the explicit `isTestMode: true` doc — legacy (undefined) does
      // NOT coalesce as test (test data is opt-in, never accidental).
      expect(docs).toHaveLength(1)
      expect(docs[0]?.name).toBe('post-v2-test')
      expect(docs[0]?.isTestMode).toBe(true)
    })
  })

  it('test mode countDocuments excludes undefined-isTestMode legacy docs', async () => {
    await withRequestContext({ derivedMode: 'test' }, async () => {
      // 1 = `post-v2-test` only. Legacy (`pre-v2-legacy`) MUST NOT count.
      expect(await WidgetModel.countDocuments({})).toBe(1)
    })
  })

  it('live mode countDocuments includes legacy docs (backward compat)', async () => {
    await withRequestContext({ derivedMode: 'live' }, async () => {
      // 2 = `post-v2-live` (false) + `pre-v2-legacy` (undefined).
      expect(await WidgetModel.countDocuments({})).toBe(2)
    })
  })
})

describe('testModeScopePlugin — schemas without isTestMode field (no-op)', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    PlainModel = buildPlainModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await PlainModel.deleteMany({})
    await PlainModel.create([{ label: 'a' }, { label: 'b' }])
  })

  it('does NOT inject any filter when the schema has no isTestMode path', async () => {
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const docs = await PlainModel.find({}).lean()
      // Plugin checks `schema.path('isTestMode')` and bails out — both docs
      // visible regardless of mode.
      expect(docs).toHaveLength(2)
    })
    await withRequestContext({ derivedMode: 'live' }, async () => {
      expect(await PlainModel.countDocuments({})).toBe(2)
    })
  })
})
