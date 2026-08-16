/**
 * Tests for the env backfill migration. Verifies idempotency + correctness
 * against a mix of legacy (no env) + new (env set) docs.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { setupTestDatabase } from '@ezstart/test-utils'
import { getE2ETestRunModel, type IE2ETestRun } from '../../models/E2ETestRun.js'
import { backfillEnvOnRuns } from '../../scripts/migrate-e2e-runs-add-env.js'
import type { Model } from 'mongoose'

describe('migrate-e2e-runs-add-env :: backfillEnvOnRuns', () => {
  let RunModel: Model<IE2ETestRun>

  beforeAll(async () => {
    await setupTestDatabase()
    RunModel = await getE2ETestRunModel()
  })

  beforeEach(async () => {
    await RunModel.deleteMany({})
  })

  it('backfills env="local" on docs that have null/missing env', async () => {
    // Insert 3 legacy docs without env using Mongoose `unset` to bypass the
    // schema default (mimicking pre-migration state).
    await RunModel.collection.insertMany([
      { testId: 'a.b.c', status: 'pass', agent: 'curl', runAt: new Date() },
      { testId: 'a.b.d', status: 'pass', agent: 'curl', runAt: new Date() },
      { testId: 'a.b.e', status: 'fail', agent: 'curl', runAt: new Date() },
    ])
    // And 1 new doc that already has env=production
    await RunModel.create({
      testId: 'a.b.f',
      status: 'pass',
      env: 'production',
      agent: 'curl',
    })

    const result = await backfillEnvOnRuns()

    expect(result.scanned).toBe(3)
    expect(result.updated).toBe(3)
    expect(result.remainingNull).toBe(0)

    const docs = await RunModel.find({}).lean().exec()
    const byTestId = new Map(docs.map(d => [d.testId, d]))
    expect(byTestId.get('a.b.c')?.env).toBe('local')
    expect(byTestId.get('a.b.d')?.env).toBe('local')
    expect(byTestId.get('a.b.e')?.env).toBe('local')
    // The pre-existing production doc must NOT be touched.
    expect(byTestId.get('a.b.f')?.env).toBe('production')
  })

  it('is idempotent — second run reports 0 scanned + 0 updated', async () => {
    await RunModel.collection.insertMany([
      { testId: 'a.b.c', status: 'pass', agent: 'curl', runAt: new Date() },
    ])

    const first = await backfillEnvOnRuns()
    expect(first.updated).toBe(1)

    const second = await backfillEnvOnRuns()
    expect(second.scanned).toBe(0)
    expect(second.updated).toBe(0)
    expect(second.remainingNull).toBe(0)
  })

  it('reports 0 updated when there are no legacy docs at all', async () => {
    await RunModel.create({
      testId: 'a.b.c',
      status: 'pass',
      env: 'staging',
      agent: 'curl',
    })

    const result = await backfillEnvOnRuns()
    expect(result.scanned).toBe(0)
    expect(result.updated).toBe(0)
    expect(result.remainingNull).toBe(0)
  })
})
