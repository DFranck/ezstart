/**
 * GET /api/webhooks/health
 * Webhook endpoint health check
 */

import { Router, OpenAPIRegistry, createRouterWithDoc } from '@ezstart/express-core'

export const healthCheckRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const healthCheckRouter = createRouterWithDoc(healthCheckRegistry, router, '/health')

healthCheckRouter.get(
  '/',
  (req, res) => {
    res.json({
      success: true,
      message: 'Webhook endpoint is healthy',
      timestamp: new Date().toISOString(),
    })
  },
  {
    summary: 'Webhook endpoint health check',
    tags: ['Webhooks'],
  }
)

export default router
