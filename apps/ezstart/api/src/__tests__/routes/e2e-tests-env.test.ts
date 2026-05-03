/**
 * Integration tests for the `env` dimension on the E2E Test Matrix routes.
 *
 * Spins up an Express app mounting only the routes under test and exercises
 * them via real HTTP. The auth middleware is bypassed because the routers
 * themselves don't gate read endpoints; the auth gate lives on the parent
 * router (cf. `routes/e2e-tests/index.ts`), so mounting the sub-routers
 * directly lets us focus on the handler logic without spinning up the
 * superadmin JWT fixture.
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
    /** ZodIssue[] when emitted by `sendValidationError`. */
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

describe('E2E test routes — env dimension', () => {
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
    // Each sub-router declares its own `/e2e-tests` basePath via
    // `createRouterWithDoc(...)`, so we mount them at root to mirror
    // production where they hang off `/api/<basePath>`.
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

  it('rejects POST /runs without env (Zod validation)', async () => {
    // Definition must exist for the testId or we'd hit the 422 branch first.
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
        agent: 'curl',
        // no env
      }),
    })

    // `sendValidationError` returns HTTP 422 (Unprocessable Entity) — the
    // canonical Zod-failure code in api-core's response helpers.
    expect(status).toBe(422)
    expect(body.success).toBe(false)
    // Validation issues are surfaced at `error.details` per api-core envelope.
    expect(JSON.stringify(body.error.details ?? [])).toContain('env')
  })

  it('rejects POST /runs with invalid env value', async () => {
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
        env: 'preview',
        agent: 'curl',
      }),
    })

    expect(status).toBe(422)
    expect(body.success).toBe(false)
  })

  it('accepts POST /runs with explicit env=staging and persists it', async () => {
    await DefinitionModel.create({
      testId: 'ezauth.public.landing',
      app: 'ezauth',
      feature: 'landing',
      category: 'public',
      description: 'Landing renders',
    })

    const { status, body } = await fetchJson<EnvelopeOk<{ env: string; testId: string }>>(
      `${baseUrl}/api/e2e-tests/runs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: 'ezauth.public.landing',
          status: 'pass',
          env: 'staging',
          agent: 'mcp-chrome-devtools',
        }),
      }
    )

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.env).toBe('staging')

    const stored = await RunModel.findOne({ testId: 'ezauth.public.landing' }).lean().exec()
    expect(stored?.env).toBe('staging')
  })

  // ─── GET / with env filter ────────────────────────────────────────────

  it('GET /api/e2e-tests?env=staging returns only the latest staging run per test', async () => {
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
    // Landing : pass in local + staging, no production
    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'pass',
      env: 'local',
      agent: 'curl',
      runAt: new Date(now - 60_000),
    })
    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'pass',
      env: 'staging',
      agent: 'curl',
      runAt: new Date(now),
    })
    // Login : pass in local, fail in staging
    await RunModel.create({
      testId: 'ezauth.auth.login',
      status: 'pass',
      env: 'local',
      agent: 'curl',
      runAt: new Date(now - 60_000),
    })
    await RunModel.create({
      testId: 'ezauth.auth.login',
      status: 'fail',
      env: 'staging',
      agent: 'curl',
      runAt: new Date(now),
    })

    const { status, body } = await fetchJson<
      EnvelopeOk<{
        tests: Array<{ testId: string; lastStatus: string; lastRun: { env: string } | null }>
      }>
    >(`${baseUrl}/api/e2e-tests?env=staging`)

    expect(status).toBe(200)
    expect(body.success).toBe(true)

    const byId = new Map(body.data.tests.map(t => [t.testId, t]))
    expect(byId.get('ezauth.public.landing')?.lastStatus).toBe('pass')
    expect(byId.get('ezauth.public.landing')?.lastRun?.env).toBe('staging')
    expect(byId.get('ezauth.auth.login')?.lastStatus).toBe('fail')
    expect(byId.get('ezauth.auth.login')?.lastRun?.env).toBe('staging')
  })

  it('GET /api/e2e-tests?env=production returns "never-run" when test never ran in production', async () => {
    await DefinitionModel.create({
      testId: 'ezauth.public.landing',
      app: 'ezauth',
      feature: 'landing',
      category: 'public',
      description: 'Landing renders',
    })

    // Test only ran locally — production should appear as never-run.
    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'pass',
      env: 'local',
      agent: 'curl',
    })

    const { body } = await fetchJson<
      EnvelopeOk<{ tests: Array<{ testId: string; lastStatus: string }> }>
    >(`${baseUrl}/api/e2e-tests?env=production`)

    const test = body.data.tests.find(t => t.testId === 'ezauth.public.landing')
    expect(test?.lastStatus).toBe('never-run')
  })

  // ─── GET /stats/summary byEnv ─────────────────────────────────────────

  it('GET /api/e2e-tests/stats/summary returns byEnv breakdown', async () => {
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

    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'pass',
      env: 'local',
      agent: 'curl',
    })
    await RunModel.create({
      testId: 'ezauth.auth.login',
      status: 'pass',
      env: 'local',
      agent: 'curl',
    })
    await RunModel.create({
      testId: 'ezauth.auth.login',
      status: 'fail',
      env: 'production',
      agent: 'curl',
    })

    const { body } = await fetchJson<
      EnvelopeOk<{
        totalDefinitions: number
        byEnv: Record<
          'local' | 'staging' | 'production',
          { pass: number; fail: number; skip: number; blocked: number; never: number }
        >
      }>
    >(`${baseUrl}/api/e2e-tests/stats/summary`)

    expect(body.success).toBe(true)
    expect(body.data.totalDefinitions).toBe(2)

    expect(body.data.byEnv.local.pass).toBe(2)
    expect(body.data.byEnv.local.never).toBe(0)

    expect(body.data.byEnv.staging.pass).toBe(0)
    expect(body.data.byEnv.staging.never).toBe(2)

    expect(body.data.byEnv.production.fail).toBe(1)
    expect(body.data.byEnv.production.never).toBe(1) // landing never ran in production
  })

  // ─── GET /:testId byEnv stats ─────────────────────────────────────────

  it('GET /api/e2e-tests/:testId returns per-env stats and tags every run with env', async () => {
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
      agent: 'curl',
    })
    await RunModel.create({
      testId: 'ezauth.public.landing',
      status: 'fail',
      env: 'production',
      agent: 'curl',
    })

    const { body } = await fetchJson<
      EnvelopeOk<{
        runs: Array<{ env: string; status: string }>
        stats: {
          byEnv: Record<
            'local' | 'staging' | 'production',
            { total: number; pass: number; fail: number }
          >
        }
      }>
    >(`${baseUrl}/api/e2e-tests/ezauth.public.landing`)

    expect(body.success).toBe(true)
    expect(body.data.runs.every(r => typeof r.env === 'string')).toBe(true)
    expect(body.data.stats.byEnv.local.pass).toBe(1)
    expect(body.data.stats.byEnv.production.fail).toBe(1)
    expect(body.data.stats.byEnv.staging.total).toBe(0)
  })
})
