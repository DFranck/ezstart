/**
 * Integration tests for the `tier` dimension on the E2E Test Matrix routes.
 *
 * Mirrors the env-dimension test structure (cf. e2e-tests-env.test.ts) but
 * focuses on the smoke / browser-e2e / unit split. Spins up an Express app
 * with the routers mounted directly so we exercise real HTTP without the
 * superadmin JWT fixture (auth lives on the parent router).
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import express from 'express'
import type { Express } from 'express'
import type { AddressInfo } from 'net'
import { setupTestDatabase } from '@ezstart/test-utils'
import {
  getE2ETestDefinitionModel,
  type IE2ETestDefinition,
} from '../../models/E2ETestDefinition.js'
import { getE2ETestRunModel, type IE2ETestRun } from '../../models/E2ETestRun.js'
import listTestsRouter from '../../routes/e2e-tests/listTests.js'
import recordRunRouter from '../../routes/e2e-tests/recordRun.js'
import statsSummaryRouter from '../../routes/e2e-tests/statsSummary.js'
import getTestRouter from '../../routes/e2e-tests/getTest.js'
import type { Model } from 'mongoose'

interface EnvelopeOk<T> {
  success: true
  data: T
  meta?: Record<string, unknown>
}

interface EnvelopeErr {
  success: false
  error: {
    message: string
    code?: string
    details?: unknown
  }
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<{
  status: number
  body: T
}> {
  const res = await fetch(url, init)
  const body = (await res.json()) as T
  return { status: res.status, body }
}

describe('E2E test routes — tier dimension', () => {
  let DefinitionModel: Model<IE2ETestDefinition>
  let RunModel: Model<IE2ETestRun>
  let app: Express
  let baseUrl: string
  let server: ReturnType<Express['listen']>

  beforeAll(async () => {
    await setupTestDatabase()
    DefinitionModel = await getE2ETestDefinitionModel()
    RunModel = await getE2ETestRunModel()

    try {
      await RunModel.collection.dropIndexes()
      await DefinitionModel.collection.dropIndexes()
    } catch {
      // ignore
    }
    await RunModel.createIndexes()
    await DefinitionModel.createIndexes()

    app = express()
    app.use(express.json())
    app.use('/api', listTestsRouter)
    app.use('/api', statsSummaryRouter)
    app.use('/api', getTestRouter)
    app.use('/api', recordRunRouter)

    await new Promise<void>(resolve => {
      server = app.listen(0, () => resolve())
    })
    const addr = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${addr.port}`
  })

  beforeEach(async () => {
    await RunModel.deleteMany({})
    await DefinitionModel.deleteMany({})
  })

  // ─── POST /runs validation ────────────────────────────────────────────

  it('rejects POST /runs without tier (Zod validation)', async () => {
    await DefinitionModel.create({
      testId: 'ezauth.public.landing',
      app: 'ezauth',
      feature: 'landing',
      category: 'public',
      description: 'Landing renders',
    })

    const { status, body } = await fetchJson<EnvelopeErr>(`${baseUrl}/api/e2e-tests/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testId: 'ezauth.public.landing',
        status: 'pass',
        env: 'local',
        agent: 'curl',
        // no tier
      }),
    })

    expect(status).toBe(422)
    expect(body.success).toBe(false)
    expect(JSON.stringify(body.error.details ?? [])).toContain('tier')
  })

  it('rejects POST /runs with invalid tier value', async () => {
    await DefinitionModel.create({
      testId: 'ezauth.public.landing',
      app: 'ezauth',
      feature: 'landing',
      category: 'public',
      description: 'Landing renders',
    })

    const { status, body } = await fetchJson<EnvelopeErr>(`${baseUrl}/api/e2e-tests/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testId: 'ezauth.public.landing',
        status: 'pass',
        env: 'local',
        tier: 'integration',
        agent: 'curl',
      }),
    })

    expect(status).toBe(422)
    expect(body.success).toBe(false)
  })

  it('accepts POST /runs with explicit tier=smoke and persists it', async () => {
    await DefinitionModel.create({
      testId: 'ezauth.public.landing',
      app: 'ezauth',
      feature: 'landing',
      category: 'public',
      description: 'Landing renders',
    })

    const { status, body } = await fetchJson<EnvelopeOk<{ tier: string; testId: string }>>(
      `${baseUrl}/api/e2e-tests/runs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: 'ezauth.public.landing',
          status: 'pass',
          env: 'production',
          tier: 'smoke',
          agent: 'curl',
        }),
      }
    )

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.tier).toBe('smoke')

    const stored = await RunModel.findOne({ testId: 'ezauth.public.landing' }).lean().exec()
    expect(stored?.tier).toBe('smoke')
    expect(stored?.env).toBe('production')
  })

  // ─── GET / with tier filter ───────────────────────────────────────────

  it('GET /api/e2e-tests?tier=smoke returns only the latest smoke run per test', async () => {
    await DefinitionModel.create({
      testId: 'ezauth.public.landing',
      app: 'ezauth',
      feature: 'landing',
      category: 'public',
      description: 'Landing renders',
    })
    await DefinitionModel.create({
      testId: 'ezauth.auth.login',
      app: 'ezauth',
      feature: 'login',
      category: 'auth',
      description: 'Login email-password flow',
    })

    const now = Date.now()
    // Landing : pass smoke + pass browser-e2e
    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'pass',
      env: 'local',
      tier: 'smoke',
      agent: 'curl',
      runAt: new Date(now - 60_000),
    })
    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'pass',
      env: 'local',
      tier: 'browser-e2e',
      agent: 'mcp-chrome-devtools',
      runAt: new Date(now),
    })
    // Login : fail smoke, pass browser-e2e (filter on smoke should surface fail)
    await RunModel.create({
      testId: 'ezauth.auth.login',
      status: 'fail',
      env: 'local',
      tier: 'smoke',
      agent: 'curl',
      runAt: new Date(now - 60_000),
    })
    await RunModel.create({
      testId: 'ezauth.auth.login',
      status: 'pass',
      env: 'local',
      tier: 'browser-e2e',
      agent: 'mcp-chrome-devtools',
      runAt: new Date(now),
    })

    const { status, body } = await fetchJson<
      EnvelopeOk<{
        tests: Array<{
          testId: string
          lastStatus: string
          lastRun: { tier: string } | null
        }>
        tier: string
      }>
    >(`${baseUrl}/api/e2e-tests?tier=smoke`)

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.tier).toBe('smoke')

    const byId = new Map(body.data.tests.map(t => [t.testId, t]))
    expect(byId.get('ezauth.public.landing')?.lastStatus).toBe('pass')
    expect(byId.get('ezauth.public.landing')?.lastRun?.tier).toBe('smoke')
    expect(byId.get('ezauth.auth.login')?.lastStatus).toBe('fail')
    expect(byId.get('ezauth.auth.login')?.lastRun?.tier).toBe('smoke')
  })

  it('GET /api/e2e-tests?tier=unit returns "never-run" when test never ran as unit', async () => {
    await DefinitionModel.create({
      testId: 'ezauth.public.landing',
      app: 'ezauth',
      feature: 'landing',
      category: 'public',
      description: 'Landing renders',
    })

    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'pass',
      env: 'local',
      tier: 'browser-e2e',
      agent: 'mcp-chrome-devtools',
    })

    const { body } = await fetchJson<
      EnvelopeOk<{ tests: Array<{ testId: string; lastStatus: string }> }>
    >(`${baseUrl}/api/e2e-tests?tier=unit`)

    const test = body.data.tests.find(t => t.testId === 'ezauth.public.landing')
    expect(test?.lastStatus).toBe('never-run')
  })

  // ─── GET /stats/summary byTier ────────────────────────────────────────

  it('GET /api/e2e-tests/stats/summary returns byTier breakdown', async () => {
    await DefinitionModel.create({
      testId: 'ezauth.public.landing',
      app: 'ezauth',
      feature: 'landing',
      category: 'public',
      description: 'Landing renders',
    })
    await DefinitionModel.create({
      testId: 'ezauth.auth.login',
      app: 'ezauth',
      feature: 'login',
      category: 'auth',
      description: 'Login flow',
    })

    // Landing : passes smoke + browser-e2e
    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'pass',
      env: 'local',
      tier: 'smoke',
      agent: 'curl',
    })
    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'pass',
      env: 'local',
      tier: 'browser-e2e',
      agent: 'mcp-chrome-devtools',
    })
    // Login : passes smoke, fails browser-e2e
    await RunModel.create({
      testId: 'ezauth.auth.login',
      status: 'pass',
      env: 'local',
      tier: 'smoke',
      agent: 'curl',
    })
    await RunModel.create({
      testId: 'ezauth.auth.login',
      status: 'fail',
      env: 'local',
      tier: 'browser-e2e',
      agent: 'mcp-chrome-devtools',
    })

    const { body } = await fetchJson<
      EnvelopeOk<{
        totalDefinitions: number
        byTier: Record<
          'smoke' | 'browser-e2e' | 'unit',
          { pass: number; fail: number; skip: number; blocked: number; never: number }
        >
      }>
    >(`${baseUrl}/api/e2e-tests/stats/summary`)

    expect(body.success).toBe(true)
    expect(body.data.totalDefinitions).toBe(2)

    expect(body.data.byTier.smoke.pass).toBe(2)
    expect(body.data.byTier.smoke.never).toBe(0)

    expect(body.data.byTier['browser-e2e'].pass).toBe(1)
    expect(body.data.byTier['browser-e2e'].fail).toBe(1)
    expect(body.data.byTier['browser-e2e'].never).toBe(0)

    expect(body.data.byTier.unit.pass).toBe(0)
    expect(body.data.byTier.unit.never).toBe(2) // neither test ever ran as unit
  })

  // ─── GET /:testId byTier stats ────────────────────────────────────────

  it('GET /api/e2e-tests/:testId returns per-tier stats and tags every run with tier', async () => {
    await DefinitionModel.create({
      testId: 'ezauth.public.landing',
      app: 'ezauth',
      feature: 'landing',
      category: 'public',
      description: 'Landing renders',
    })

    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'pass',
      env: 'local',
      tier: 'smoke',
      agent: 'curl',
    })
    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'fail',
      env: 'local',
      tier: 'browser-e2e',
      agent: 'mcp-chrome-devtools',
    })

    const { body } = await fetchJson<
      EnvelopeOk<{
        runs: Array<{ tier: string; status: string }>
        stats: {
          byTier: Record<
            'smoke' | 'browser-e2e' | 'unit',
            { total: number; pass: number; fail: number }
          >
        }
      }>
    >(`${baseUrl}/api/e2e-tests/ezauth.public.landing`)

    expect(body.success).toBe(true)
    expect(body.data.runs.every(r => typeof r.tier === 'string')).toBe(true)
    expect(body.data.stats.byTier.smoke.pass).toBe(1)
    expect(body.data.stats.byTier['browser-e2e'].fail).toBe(1)
    expect(body.data.stats.byTier.unit.total).toBe(0)
  })

  // ─── Combined env + tier filter ───────────────────────────────────────

  it('GET /api/e2e-tests?env=production&tier=smoke filters on both dimensions', async () => {
    await DefinitionModel.create({
      testId: 'ezauth.public.landing',
      app: 'ezauth',
      feature: 'landing',
      category: 'public',
      description: 'Landing renders',
    })

    // Local smoke : pass — should NOT match the (production, smoke) filter
    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'pass',
      env: 'local',
      tier: 'smoke',
      agent: 'curl',
    })
    // Production browser-e2e : pass — should NOT match either
    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'pass',
      env: 'production',
      tier: 'browser-e2e',
      agent: 'mcp-chrome-devtools',
    })
    // Production smoke : fail — this is the one we want surfaced
    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'fail',
      env: 'production',
      tier: 'smoke',
      agent: 'curl',
    })

    const { body } = await fetchJson<
      EnvelopeOk<{
        tests: Array<{ testId: string; lastStatus: string; lastRun: { env: string; tier: string } }>
      }>
    >(`${baseUrl}/api/e2e-tests?env=production&tier=smoke`)

    const test = body.data.tests.find(t => t.testId === 'ezauth.public.landing')
    expect(test?.lastStatus).toBe('fail')
    expect(test?.lastRun.env).toBe('production')
    expect(test?.lastRun.tier).toBe('smoke')
  })
})
