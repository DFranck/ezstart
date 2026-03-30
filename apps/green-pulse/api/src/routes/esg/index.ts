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

// Import individual action routers
import createProjectRouter, { createProjectRegistry } from './createProject.js'
import pushActivityDataRouter, { pushActivityDataRegistry } from './pushActivityData.js'
import generateReportRouter, { generateReportRegistry } from './generateReport.js'
import getReportStatusRouter, { getReportStatusRegistry } from './getReportStatus.js'
import processEsgDataRouter, { processEsgDataRegistry } from './processEsgData.js'

// Export all registries as an array for OpenAPI documentation
export const esgRegistries = [
  createProjectRegistry,
  pushActivityDataRegistry,
  generateReportRegistry,
  getReportStatusRegistry,
  processEsgDataRegistry,
]

// Consolidate all action routers
const router: import('express').Router = Router()

router
  .use('/projects', createProjectRouter) // POST /projects
  .use('/activity-data', pushActivityDataRouter) // POST /activity-data
  .use('/reports', generateReportRouter) // POST /reports
  .use('/reports/:jobId/status', getReportStatusRouter) // GET /reports/:jobId/status
  .use('/process', processEsgDataRouter) // POST /process

export default router
