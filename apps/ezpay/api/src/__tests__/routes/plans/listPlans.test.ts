/**
 * Tests for GET /plans — public list with applicationId / appName filters
 * and optional inactive inclusion for superadmin.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import { getPlanModel, type PlanDocument } from '../../../models/Plan.js'
import type { Model } from 'mongoose'
import type { EzauthApplicationLookup } from '../../../services/ezauth-client.js'

const lookupApplicationBySlugMock =
  vi.fn<(slug: string, opts?: unknown) => Promise<EzauthApplicationLookup | null>>()

vi.mock('../../../services/ezauth-client.js', () => ({
  lookupApplicationBySlug: lookupApplicationBySlugMock,
}))

let currentGlobalRoles: string[] = []

vi.mock('../../../middleware/auth.js', () => ({
  isAdminUser: (): boolean => currentGlobalRoles.includes('superadmin'),
  // unused but the module re-exports these in the route module graph.
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
  populateUserFromToken: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction
  ) => next(),
}))

const listRouteMod = await import('../../../routes/plans/listPlans.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/', listRouteMod.default)
  return app
}

interface TestResponse {
  status: number
  body: {
    success: boolean
    data?: unknown
    meta?: Record<string, unknown>
    error?: unknown
  }
}

async function getPlans(app: Express, query = ''): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      const port = address.port
      const suffix = query ? `?${query}` : ''
      fetch(`http://127.0.0.1:${port}/plans${suffix}`)
        .then(async r => {
          const body = (await r.json()) as TestResponse['body']
          server.close()
          resolve({ status: r.status, body })
        })
        .catch(err => {
          server.close()
          reject(err)
        })
    })
  })
}

describe('GET /plans — list (public)', () => {
  let app: Express
  let Plan: Model<PlanDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    app = createApp()
    Plan = await getPlanModel()
    try {
      await Plan.collection.dropIndexes()
    } catch {
      // ignore
    }
    await Plan.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Plan.deleteMany({})
    lookupApplicationBySlugMock.mockReset()
    currentGlobalRoles = []
  })

  it('filters by applicationId', async () => {
    await Plan.create({
      name: 'Pro',
      applicationId: 'app-1',
      appName: 'ezbill',
      amount: 999,
      interval: 'month',
      intervalCount: 1,
    })
    await Plan.create({
      name: 'Free',
      applicationId: 'app-2',
      appName: 'green-pulse',
      amount: 0,
      interval: 'month',
      intervalCount: 1,
    })

    const res = await getPlans(app, 'applicationId=app-1')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const data = res.body.data as Array<{ applicationId: string }>
    expect(data).toHaveLength(1)
    expect(data[0]?.applicationId).toBe('app-1')
    expect(lookupApplicationBySlugMock).not.toHaveBeenCalled()
  })

  it('falls back to appName lookup when applicationId is absent (legacy clients)', async () => {
    await Plan.create({
      name: 'Legacy',
      applicationId: 'app-legacy',
      appName: 'ezbill',
      amount: 999,
      interval: 'month',
      intervalCount: 1,
    })

    lookupApplicationBySlugMock.mockResolvedValue({
      id: 'app-legacy',
      slug: 'ezbill',
      name: 'EZBill',
    })

    const res = await getPlans(app, 'appName=ezbill')
    expect(res.status).toBe(200)
    const data = res.body.data as Array<{ appName: string }>
    expect(data).toHaveLength(1)
    expect(data[0]?.appName).toBe('ezbill')
    expect(lookupApplicationBySlugMock).toHaveBeenCalled()
    expect(lookupApplicationBySlugMock.mock.calls[0]?.[0]).toBe('ezbill')
  })

  it('returns an empty list for an unknown slug (no 404 leak)', async () => {
    lookupApplicationBySlugMock.mockResolvedValue(null)

    const res = await getPlans(app, 'appName=unknown-app')
    expect(res.status).toBe(200)
    const data = res.body.data as Array<unknown>
    expect(data).toEqual([])
  })

  it('only returns active plans by default', async () => {
    await Plan.create({
      name: 'Active',
      applicationId: 'app-1',
      amount: 0,
      interval: 'month',
      intervalCount: 1,
      active: true,
    })
    await Plan.create({
      name: 'Inactive',
      applicationId: 'app-1',
      amount: 0,
      interval: 'month',
      intervalCount: 1,
      active: false,
    })

    const res = await getPlans(app, 'applicationId=app-1')
    const data = res.body.data as Array<{ name: string }>
    expect(data).toHaveLength(1)
    expect(data[0]?.name).toBe('Active')
  })

  it('includes inactive plans when includeInactive=true AND caller is superadmin', async () => {
    currentGlobalRoles = ['superadmin']
    await Plan.create({
      name: 'Active',
      applicationId: 'app-1',
      amount: 0,
      interval: 'month',
      intervalCount: 1,
      active: true,
    })
    await Plan.create({
      name: 'Inactive',
      applicationId: 'app-1',
      amount: 0,
      interval: 'month',
      intervalCount: 1,
      active: false,
    })

    const res = await getPlans(app, 'applicationId=app-1&includeInactive=true')
    const data = res.body.data as Array<{ name: string }>
    expect(data).toHaveLength(2)
  })

  it('ignores includeInactive when caller is NOT superadmin', async () => {
    await Plan.create({
      name: 'Active',
      applicationId: 'app-1',
      amount: 0,
      interval: 'month',
      intervalCount: 1,
      active: true,
    })
    await Plan.create({
      name: 'Inactive',
      applicationId: 'app-1',
      amount: 0,
      interval: 'month',
      intervalCount: 1,
      active: false,
    })

    const res = await getPlans(app, 'applicationId=app-1&includeInactive=true')
    const data = res.body.data as Array<{ name: string }>
    expect(data).toHaveLength(1)
    expect(data[0]?.name).toBe('Active')
  })
})
