/**
 * E2E Test Matrix feature router.
 *
 * Mounted at `/api/e2e-tests` (and `/api/v1/e2e-tests` via createVersionedRouter).
 *
 * Routes:
 * - GET    /api/e2e-tests                 → listTests          (public read)
 * - GET    /api/e2e-tests/stats/summary   → statsSummary       (public read)
 * - GET    /api/e2e-tests/needs-rerun     → needsRerun         (admin only)
 * - GET    /api/e2e-tests/:testId         → getTest            (public read)
 * - POST   /api/e2e-tests/definitions     → upsertDefinition   (admin only)
 * - POST   /api/e2e-tests/runs            → recordRun          (admin only)
 *
 * Auth split rationale: read endpoints stay public so the dashboard can render
 * without forcing a session for the matrix overview, while write endpoints
 * require admin so only the seeder + the helper CLI (with a superadmin JWT)
 * can mutate state.
 */

import { Router, createRoleMiddleware, createStrictRateLimiter } from '@ezstart/api-core'
import { authMiddleware } from '../../middleware/auth.js'

import listTestsRouter, { listTestsRegistry } from './listTests.js'
import getTestRouter, { getTestRegistry } from './getTest.js'
import upsertDefinitionRouter, { upsertDefinitionRegistry } from './upsertDefinition.js'
import recordRunRouter, { recordRunRegistry } from './recordRun.js'
import needsRerunRouter, { needsRerunRegistry } from './needsRerun.js'
import statsSummaryRouter, { statsSummaryRegistry } from './statsSummary.js'

export const e2eTestsRegistries = [
  listTestsRegistry,
  getTestRegistry,
  upsertDefinitionRegistry,
  recordRunRegistry,
  needsRerunRegistry,
  statsSummaryRegistry,
]

const { requireAdmin } = createRoleMiddleware()

const router: import('express').Router = Router()

// Admin guards on the writes + needs-rerun (which shells out to git).
router.post('/e2e-tests/definitions', authMiddleware, requireAdmin)
router.post('/e2e-tests/runs', authMiddleware, requireAdmin, createStrictRateLimiter())
router.get('/e2e-tests/needs-rerun', authMiddleware, requireAdmin)

router
  .use('/', listTestsRouter)
  .use('/', statsSummaryRouter)
  .use('/', needsRerunRouter)
  .use('/', getTestRouter)
  .use('/', upsertDefinitionRouter)
  .use('/', recordRunRouter)

export default router
