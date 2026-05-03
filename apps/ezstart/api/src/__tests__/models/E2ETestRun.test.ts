import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { setupTestDatabase } from '@ezstart/test-utils'
import { getE2ETestRunModel, type IE2ETestRun } from '../../models/E2ETestRun.js'
import type { Model } from 'mongoose'

describe('E2ETestRun Model', () => {
  let RunModel: Model<IE2ETestRun>

  beforeAll(async () => {
    await setupTestDatabase()
    RunModel = await getE2ETestRunModel()
    try {
      await RunModel.collection.dropIndexes()
    } catch {
      // ignore
    }
    await RunModel.createIndexes()
  })

  beforeEach(async () => {
    await RunModel.deleteMany({})
  })

  it('creates a pass run with required fields', async () => {
    const run = await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'pass',
      agent: 'mcp-chrome-devtools',
    })
    expect(run.status).toBe('pass')
    expect(run.runAt).toBeInstanceOf(Date)
    expect(run.errors).toEqual([])
  })

  it('rejects invalid status', async () => {
    const doc = new RunModel({
      testId: 'ezauth.public.landing',
      status: 'maybe-pass',
      agent: 'curl',
    })
    await expect(doc.validate()).rejects.toThrow()
  })

  it('stores fail with errors[]', async () => {
    const run = await RunModel.create({
      testId: 'ezauth.auth.login-email',
      status: 'fail',
      agent: 'curl',
      errors: ['401 Unauthorized', 'Token missing in cookie'],
    })
    expect(run.errors).toHaveLength(2)
  })

  it('computes pass rate via aggregation', async () => {
    const testId = 'ezauth.public.landing'
    await RunModel.create({ testId, status: 'pass', agent: 'curl' })
    await RunModel.create({ testId, status: 'pass', agent: 'curl' })
    await RunModel.create({ testId, status: 'pass', agent: 'curl' })
    await RunModel.create({ testId, status: 'fail', agent: 'curl', errors: ['boom'] })

    const stats = await RunModel.aggregate<{
      total: number
      pass: number
      passRate: number
    }>([
      { $match: { testId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pass: { $sum: { $cond: [{ $eq: ['$status', 'pass'] }, 1, 0] } },
        },
      },
      {
        $project: {
          total: 1,
          pass: 1,
          passRate: { $multiply: [{ $divide: ['$pass', '$total'] }, 100] },
        },
      },
    ])
    expect(stats[0]?.total).toBe(4)
    expect(stats[0]?.pass).toBe(3)
    expect(stats[0]?.passRate).toBe(75)
  })

  it('returns latest run per testId via group $first sorted desc', async () => {
    const a = 'ezauth.public.landing'
    const b = 'ezpay.public.landing'

    await RunModel.create({
      testId: a,
      status: 'pass',
      agent: 'curl',
      runAt: new Date('2026-01-01T00:00:00Z'),
    })
    await RunModel.create({
      testId: a,
      status: 'fail',
      agent: 'curl',
      runAt: new Date('2026-01-02T00:00:00Z'),
    })
    await RunModel.create({
      testId: b,
      status: 'pass',
      agent: 'curl',
      runAt: new Date('2026-01-05T00:00:00Z'),
    })

    const latest = await RunModel.aggregate<{ _id: string; status: string; runAt: Date }>([
      { $sort: { testId: 1, runAt: -1 } },
      { $group: { _id: '$testId', status: { $first: '$status' }, runAt: { $first: '$runAt' } } },
    ])
    const map = new Map(latest.map(r => [r._id, r]))
    expect(map.get(a)?.status).toBe('fail')
    expect(map.get(b)?.status).toBe('pass')
  })
})
