/**
 * Tests for the tier backfill migration. Verifies idempotency + correct
 * agent → tier mapping against a mix of legacy (no tier) + new (tier set)
 * docs.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { setupTestDatabase } from '@ezstart/test-utils'
import { getE2ETestRunModel, type IE2ETestRun } from '../../models/E2ETestRun.js'
import { backfillTierOnRuns } from '../../scripts/migrate-e2e-runs-add-tier.js'
import type { Model } from 'mongoose'

describe('migrate-e2e-runs-add-tier :: backfillTierOnRuns', () => {
  let RunModel: Model<IE2ETestRun>

  beforeAll(async () => {
    await setupTestDatabase()
    RunModel = await getE2ETestRunModel()
  })

  beforeEach(async () => {
    await RunModel.deleteMany({})
  })

  it('maps curl/http → smoke', async () => {
    await RunModel.collection.insertMany([
      { testId: 'a.b.c', status: 'pass', env: 'local', agent: 'curl', runAt: new Date() },
      { testId: 'a.b.d', status: 'pass', env: 'local', agent: 'http', runAt: new Date() },
    ])

    const result = await backfillTierOnRuns()

    expect(result.scanned).toBe(2)
    expect(result.updated).toBe(2)
    expect(result.perTier.smoke).toBe(2)
    expect(result.perTier['browser-e2e']).toBe(0)
    expect(result.perTier.unit).toBe(0)
    expect(result.remainingNull).toBe(0)

    const docs = await RunModel.find({}).lean().exec()
    expect(docs.every(d => d.tier === 'smoke')).toBe(true)
  })

  it('maps mcp-chrome-devtools/playwright/cypress → browser-e2e', async () => {
    await RunModel.collection.insertMany([
      {
        testId: 'a.b.c',
        status: 'pass',
        env: 'local',
        agent: 'mcp-chrome-devtools',
        runAt: new Date(),
      },
      { testId: 'a.b.d', status: 'pass', env: 'local', agent: 'playwright', runAt: new Date() },
      { testId: 'a.b.e', status: 'pass', env: 'local', agent: 'cypress', runAt: new Date() },
    ])

    const result = await backfillTierOnRuns()

    expect(result.scanned).toBe(3)
    expect(result.updated).toBe(3)
    expect(result.perTier.smoke).toBe(0)
    expect(result.perTier['browser-e2e']).toBe(3)
    expect(result.perTier.unit).toBe(0)

    const docs = await RunModel.find({}).lean().exec()
    expect(docs.every(d => d.tier === 'browser-e2e')).toBe(true)
  })

  it('maps vitest/jest/ci-vitest → unit', async () => {
    await RunModel.collection.insertMany([
      { testId: 'a.b.c', status: 'pass', env: 'local', agent: 'vitest', runAt: new Date() },
      { testId: 'a.b.d', status: 'pass', env: 'local', agent: 'jest', runAt: new Date() },
      { testId: 'a.b.e', status: 'pass', env: 'local', agent: 'ci-vitest', runAt: new Date() },
    ])

    const result = await backfillTierOnRuns()

    expect(result.scanned).toBe(3)
    expect(result.updated).toBe(3)
    expect(result.perTier.unit).toBe(3)
    expect(result.perTier.smoke).toBe(0)
    expect(result.perTier['browser-e2e']).toBe(0)
  })

  it('falls back to browser-e2e for unknown agents (e.g. session-bulk-import, manual)', async () => {
    await RunModel.collection.insertMany([
      {
        testId: 'a.b.c',
        status: 'pass',
        env: 'local',
        agent: 'session-bulk-import',
        runAt: new Date(),
      },
      { testId: 'a.b.d', status: 'pass', env: 'local', agent: 'manual', runAt: new Date() },
    ])

    const result = await backfillTierOnRuns()

    expect(result.scanned).toBe(2)
    expect(result.updated).toBe(2)
    expect(result.perTier['browser-e2e']).toBe(2)

    const docs = await RunModel.find({}).lean().exec()
    expect(docs.every(d => d.tier === 'browser-e2e')).toBe(true)
  })

  it('does not touch docs that already have a tier', async () => {
    // Pre-existing doc with tier=smoke
    await RunModel.create({
      testId: 'a.b.f',
      status: 'pass',
      env: 'local',
      tier: 'smoke',
      agent: 'mcp-chrome-devtools',
    })

    const result = await backfillTierOnRuns()

    expect(result.scanned).toBe(0)
    expect(result.updated).toBe(0)

    const doc = await RunModel.findOne({ testId: 'a.b.f' }).lean().exec()
    expect(doc?.tier).toBe('smoke')
  })

  it('is idempotent — second run reports 0 scanned + 0 updated', async () => {
    await RunModel.collection.insertMany([
      { testId: 'a.b.c', status: 'pass', env: 'local', agent: 'curl', runAt: new Date() },
    ])

    const first = await backfillTierOnRuns()
    expect(first.updated).toBe(1)

    const second = await backfillTierOnRuns()
    expect(second.scanned).toBe(0)
    expect(second.updated).toBe(0)
    expect(second.remainingNull).toBe(0)
  })

  it('mixes agents into separate buckets in a single pass', async () => {
    await RunModel.collection.insertMany([
      { testId: 'a.b.c', status: 'pass', env: 'local', agent: 'curl', runAt: new Date() },
      { testId: 'a.b.d', status: 'pass', env: 'local', agent: 'curl', runAt: new Date() },
      {
        testId: 'a.b.e',
        status: 'pass',
        env: 'local',
        agent: 'mcp-chrome-devtools',
        runAt: new Date(),
      },
      { testId: 'a.b.f', status: 'pass', env: 'local', agent: 'vitest', runAt: new Date() },
      {
        testId: 'a.b.g',
        status: 'pass',
        env: 'local',
        agent: 'session-bulk-import',
        runAt: new Date(),
      },
    ])

    const result = await backfillTierOnRuns()

    expect(result.scanned).toBe(5)
    expect(result.updated).toBe(5)
    expect(result.perTier.smoke).toBe(2)
    expect(result.perTier['browser-e2e']).toBe(2) // mcp + session-bulk-import
    expect(result.perTier.unit).toBe(1)
  })
})
