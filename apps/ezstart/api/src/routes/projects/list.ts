/**
 * GET /api/projects
 *
 * Get project-grouped health checks
 *
 * Returns one card per project with all endpoints (API + Web)
 * - Development: Checks local URLs only
 * - Production: Checks production URLs only
 */

import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import { ProjectHealthChecker } from '@ezstart/monitoring'
import type { Request, Response } from 'express'

export const router: ReturnType<typeof Router> = Router()

const projectHealthChecker = new ProjectHealthChecker()

const listProjectsHandler = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const offset = Math.max(Number(req.query.offset) || 0, 0)

    const environment = process.env.NODE_ENV === 'production' ? 'production' : 'local'
    const timeout = Number(process.env.HEALTH_CHECK_TIMEOUT) || 5000
    const retries = Number(process.env.HEALTH_CHECK_RETRIES) || 3

    const allProjects = await projectHealthChecker.checkAllProjects(environment, {
      timeout,
      retries,
    })

    const total = allProjects.length
    const projects = allProjects.slice(offset, offset + limit)

    sendSuccess(
      res,
      {
        projects,
        environment,
        summary: {
          total,
          healthy: projects.filter(p => p.overallStatus === 'healthy').length,
          degraded: projects.filter(p => p.overallStatus === 'degraded').length,
          unhealthy: projects.filter(p => p.overallStatus === 'unhealthy').length,
        },
      },
      { total, limit, offset }
    )
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to check projects')
  }
}

router.get('/', listProjectsHandler)

export default router as ReturnType<typeof Router>
