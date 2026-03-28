/**
 * GET /api/metrics
 *
 * Root metrics endpoint - TODO: implement full metrics
 */

import { createRouterWithDoc, OpenAPIRegistry, Router, sendSuccess } from '@ezstart/express-core'
import type { Request, Response } from 'express'

export const registry = new OpenAPIRegistry()
export const router: ReturnType<typeof Router> = Router()
const docRouter = createRouterWithDoc(registry, router)

const getRootMetricsHandler = async (_: Request, res: Response) => {
  sendSuccess(res, { message: 'Metrics endpoint - TODO: implement full metrics' })
}

router.get('/', getRootMetricsHandler)

export default router as ReturnType<typeof Router>
