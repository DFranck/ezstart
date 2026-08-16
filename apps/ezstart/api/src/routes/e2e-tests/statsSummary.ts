/**
 * GET /api/e2e-tests/stats/summary
 *
 * Global matrix summary — total definitions, latest-run breakdown, by-app
 * breakdown, and pass rate. Read-only, public.
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { getE2ETestDefinitionModel } from '../../models/E2ETestDefinition.js'
import {
  E2E_RUN_ENVS,
  E2E_RUN_TIERS,
  getE2ETestRunModel,
  type E2ERunEnv,
  type E2ERunTier,
} from '../../models/E2ETestRun.js'

export const statsSummaryRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const statsSummaryRouter = createRouterWithDoc(statsSummaryRegistry, router, '/e2e-tests')

statsSummaryRouter.get(
  '/stats/summary',
  async (_req, res) => {
    try {
      const Definition = await getE2ETestDefinitionModel()
      const Run = await getE2ETestRunModel()

      // Counts of definitions per app.
      const defByApp = await Definition.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$app', count: { $sum: 1 } } },
      ])

      const totalDefinitions = await Definition.countDocuments({})

      // Latest run per testId, then count buckets per status + per app.
      const latest = await Run.aggregate<{
        _id: string
        status: string
      }>([
        { $sort: { testId: 1, runAt: -1 } },
        {
          $group: {
            _id: '$testId',
            status: { $first: '$status' },
          },
        },
      ])

      const statusCounts = { pass: 0, fail: 0, skip: 0, blocked: 0, never: 0 }
      const latestByTest = new Map<string, string>()
      for (const r of latest) {
        if (r.status in statusCounts) {
          statusCounts[r.status as keyof typeof statusCounts]++
        }
        latestByTest.set(r._id, r.status)
      }

      // Tests with definitions but no run at all.
      const allDefIds = (await Definition.find({}, { testId: 1 }).lean().exec()) as Array<{
        testId: string
      }>
      let neverRun = 0
      for (const d of allDefIds) {
        if (!latestByTest.has(d.testId)) neverRun++
      }
      statusCounts.never = neverRun

      // Per-app breakdown using latest-run map.
      const byApp = defByApp.map(({ _id, count }) => {
        const appDefs = allDefIds.filter(d => d.testId.startsWith(`${_id}.`))
        const appCounts = { pass: 0, fail: 0, skip: 0, blocked: 0, never: 0 }
        for (const d of appDefs) {
          const status = latestByTest.get(d.testId)
          if (status && status in appCounts) {
            appCounts[status as keyof typeof appCounts]++
          } else {
            appCounts.never++
          }
        }
        return {
          app: _id,
          totalDefinitions: count,
          ...appCounts,
        }
      })

      const ranked =
        statusCounts.pass + statusCounts.fail + statusCounts.skip + statusCounts.blocked
      const passRate = ranked > 0 ? Math.round((statusCounts.pass / ranked) * 1000) / 10 : null

      // Per-env breakdown: latest run per (testId, env) combo, then bucket by status.
      const latestPerEnv = await Run.aggregate<{
        _id: { testId: string; env: string }
        status: string
      }>([
        { $sort: { testId: 1, env: 1, runAt: -1 } },
        {
          $group: {
            _id: { testId: '$testId', env: '$env' },
            status: { $first: '$status' },
          },
        },
      ])

      type EnvCounts = { pass: number; fail: number; skip: number; blocked: number; never: number }
      const byEnv: Record<E2ERunEnv, EnvCounts> = {
        local: { pass: 0, fail: 0, skip: 0, blocked: 0, never: 0 },
        staging: { pass: 0, fail: 0, skip: 0, blocked: 0, never: 0 },
        production: { pass: 0, fail: 0, skip: 0, blocked: 0, never: 0 },
      }
      const seenPerEnv: Record<E2ERunEnv, Set<string>> = {
        local: new Set(),
        staging: new Set(),
        production: new Set(),
      }
      for (const row of latestPerEnv) {
        const env = (row._id?.env ?? 'local') as E2ERunEnv
        if (!E2E_RUN_ENVS.includes(env)) continue
        seenPerEnv[env].add(row._id.testId)
        if (row.status in byEnv[env]) {
          byEnv[env][row.status as keyof EnvCounts]++
        }
      }
      // "never" counts = definitions without any run in that specific env.
      for (const env of E2E_RUN_ENVS) {
        let neverCount = 0
        for (const def of allDefIds) {
          if (!seenPerEnv[env].has(def.testId)) neverCount++
        }
        byEnv[env].never = neverCount
      }

      // Per-tier breakdown: latest run per (testId, tier) combo, then bucket by status.
      const latestPerTier = await Run.aggregate<{
        _id: { testId: string; tier: string }
        status: string
      }>([
        { $sort: { testId: 1, tier: 1, runAt: -1 } },
        {
          $group: {
            _id: { testId: '$testId', tier: '$tier' },
            status: { $first: '$status' },
          },
        },
      ])

      type TierCounts = {
        pass: number
        fail: number
        skip: number
        blocked: number
        never: number
      }
      const byTier: Record<E2ERunTier, TierCounts> = {
        smoke: { pass: 0, fail: 0, skip: 0, blocked: 0, never: 0 },
        'browser-e2e': { pass: 0, fail: 0, skip: 0, blocked: 0, never: 0 },
        unit: { pass: 0, fail: 0, skip: 0, blocked: 0, never: 0 },
      }
      const seenPerTier: Record<E2ERunTier, Set<string>> = {
        smoke: new Set(),
        'browser-e2e': new Set(),
        unit: new Set(),
      }
      for (const row of latestPerTier) {
        const tier = (row._id?.tier ?? 'browser-e2e') as E2ERunTier
        if (!E2E_RUN_TIERS.includes(tier)) continue
        seenPerTier[tier].add(row._id.testId)
        if (row.status in byTier[tier]) {
          byTier[tier][row.status as keyof TierCounts]++
        }
      }
      // "never" counts = definitions without any run in that specific tier.
      for (const tier of E2E_RUN_TIERS) {
        let neverCount = 0
        for (const def of allDefIds) {
          if (!seenPerTier[tier].has(def.testId)) neverCount++
        }
        byTier[tier].never = neverCount
      }

      // Per-env-per-tier breakdown — drives the env-grouped admin UI where
      // each env panel shows a tier sub-breakdown (smoke / browser-e2e / unit
      // pass counts within that specific env). Latest run per
      // (testId, env, tier) tuple, bucketed by status.
      const latestPerEnvTier = await Run.aggregate<{
        _id: { testId: string; env: string; tier: string }
        status: string
      }>([
        { $sort: { testId: 1, env: 1, tier: 1, runAt: -1 } },
        {
          $group: {
            _id: { testId: '$testId', env: '$env', tier: '$tier' },
            status: { $first: '$status' },
          },
        },
      ])

      const makeEmptyTierMap = (): Record<E2ERunTier, TierCounts> => ({
        smoke: { pass: 0, fail: 0, skip: 0, blocked: 0, never: 0 },
        'browser-e2e': { pass: 0, fail: 0, skip: 0, blocked: 0, never: 0 },
        unit: { pass: 0, fail: 0, skip: 0, blocked: 0, never: 0 },
      })

      const byEnvTier: Record<E2ERunEnv, Record<E2ERunTier, TierCounts>> = {
        local: makeEmptyTierMap(),
        staging: makeEmptyTierMap(),
        production: makeEmptyTierMap(),
      }
      const seenPerEnvTier: Record<E2ERunEnv, Record<E2ERunTier, Set<string>>> = {
        local: { smoke: new Set(), 'browser-e2e': new Set(), unit: new Set() },
        staging: { smoke: new Set(), 'browser-e2e': new Set(), unit: new Set() },
        production: { smoke: new Set(), 'browser-e2e': new Set(), unit: new Set() },
      }
      for (const row of latestPerEnvTier) {
        const env = (row._id?.env ?? 'local') as E2ERunEnv
        const tier = (row._id?.tier ?? 'browser-e2e') as E2ERunTier
        if (!E2E_RUN_ENVS.includes(env)) continue
        if (!E2E_RUN_TIERS.includes(tier)) continue
        seenPerEnvTier[env][tier].add(row._id.testId)
        if (row.status in byEnvTier[env][tier]) {
          byEnvTier[env][tier][row.status as keyof TierCounts]++
        }
      }
      // "never" counts per (env, tier) — definitions that never ran in that combo.
      for (const env of E2E_RUN_ENVS) {
        for (const tier of E2E_RUN_TIERS) {
          let neverCount = 0
          for (const def of allDefIds) {
            if (!seenPerEnvTier[env][tier].has(def.testId)) neverCount++
          }
          byEnvTier[env][tier].never = neverCount
        }
      }

      const lastRunDoc = await Run.findOne({}).sort({ runAt: -1 }).lean().exec()

      return sendSuccess(res, {
        totalDefinitions,
        latestRunBreakdown: statusCounts,
        passRate,
        byApp,
        byEnv,
        byTier,
        byEnvTier,
        lastRunAt: lastRunDoc?.runAt ?? null,
        evaluatedAt: new Date(),
      })
    } catch (error) {
      logger.error('[E2E Tests] Stats summary error:', error)
      return sendError(res, 'Failed to compute stats summary')
    }
  },
  {
    summary: 'Global E2E test matrix summary',
    tags: ['E2E Tests'],
  }
)

export default router
