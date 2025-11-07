/**
 * Webhooks Feature Router
 *
 * Consolidates all webhook-related actions into a single router.
 * Each action is defined in its own file following the action-based routing pattern.
 *
 * Routes:
 * - POST /api/webhooks/esg-report -> handleEsgReport (ESG report events)
 * - GET  /api/webhooks/health     -> healthCheck
 */

import { Router } from '@ezstart/express-core'

// Import individual action routers
import handleEsgReportRouter, { handleEsgReportRegistry } from './handleEsgReport.js'
import healthCheckRouter, { healthCheckRegistry } from './healthCheck.js'

// Export all registries as an array for OpenAPI documentation
export const webhookRegistries = [
  handleEsgReportRegistry,
  healthCheckRegistry,
]

// Consolidate all action routers
const router: any = Router()

router
  .use('/esg-report', handleEsgReportRouter) // POST /esg-report
  .use('/health', healthCheckRouter)         // GET /health

export default router
