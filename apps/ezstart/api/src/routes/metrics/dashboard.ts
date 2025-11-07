/**
 * GET /api/metrics/dashboard
 *
 * Dashboard metrics endpoint - redirects to root metrics
 */

import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import type { Request, Response } from 'express'

export const registry = new OpenAPIRegistry()
export const router: ReturnType<typeof Router> = Router()
const docRouter = createRouterWithDoc(registry, router)

const getDashboardMetricsHandler = async (_: Request, res: Response) => {
  res.redirect('/api/metrics')
}

router.get('/dashboard', getDashboardMetricsHandler)

export default router as ReturnType<typeof Router>
