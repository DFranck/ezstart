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
export const webhookRegistries = [handleEsgReportRegistry, healthCheckRegistry]

// Consolidate all action routers
const router: import('express').Router = Router()

// This parent is mounted at /api (no /webhooks prefix) — children own '/esg-report'
// and '/health' basePaths via createRouterWithDoc. We re-prefix them with
// '/webhooks' here so the final URL matches /api/webhooks/<resource>.
router.use('/webhooks', handleEsgReportRouter).use('/webhooks', healthCheckRouter)

export default router
