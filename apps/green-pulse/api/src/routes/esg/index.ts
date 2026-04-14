/**
 * ESG Feature Router
 *
 * Consolidates all ESG-related actions into a single router.
 * Each action is defined in its own file following the action-based routing pattern.
 *
 * Routes:
 * - POST /api/esg/projects              -> createProject
 * - POST /api/esg/activity-data         -> pushActivityData
 * - POST /api/esg/reports               -> generateReport
 * - GET  /api/esg/reports/:jobId/status -> getReportStatus
 * - POST /api/esg/process               -> processEsgData (complete workflow)
 */

import { Router } from '@ezstart/express-core'
import { authMiddleware } from '../../middleware/auth.js'

// Import individual action routers
import createProjectRouter, { createProjectRegistry } from './createProject.js'
import pushActivityDataRouter, { pushActivityDataRegistry } from './pushActivityData.js'
import generateReportRouter, { generateReportRegistry } from './generateReport.js'
import getReportStatusRouter, { getReportStatusRegistry } from './getReportStatus.js'
import processEsgDataRouter, { processEsgDataRegistry } from './processEsgData.js'
import extractEsgDataRouter, { extractEsgDataRegistry } from '../chat/extractEsgData.js'

// Export all registries as an array for OpenAPI documentation
export const esgRegistries = [
  createProjectRegistry,
  pushActivityDataRegistry,
  generateReportRegistry,
  getReportStatusRegistry,
  processEsgDataRegistry,
  extractEsgDataRegistry,
]

// Consolidate all action routers — all ESG routes require authentication.
// This parent is mounted at /api (no /esg prefix) — children own their basePaths
// ('/projects', '/activity-data', '/reports', '/reports/:jobId/status',
// '/process', '/extract') via createRouterWithDoc. We re-prefix them with '/esg'
// here so the final URL matches /api/esg/<resource>, and scope auth middleware
// to '/esg' to avoid leaking to sibling features.
const router: import('express').Router = Router()
router.use('/esg', authMiddleware)

router
  .use('/esg', createProjectRouter)
  .use('/esg', pushActivityDataRouter)
  .use('/esg', generateReportRouter)
  .use('/esg', getReportStatusRouter)
  .use('/esg', processEsgDataRouter)
  .use('/esg', extractEsgDataRouter)

export default router
