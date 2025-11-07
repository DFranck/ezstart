/**
 * GET /api/projects
 *
 * Get project-grouped health checks
 *
 * Returns one card per project with all endpoints (API + Web)
 * - Development: Checks local URLs only
 * - Production: Checks production URLs only
 */

import { Router } from '@ezstart/express-core'
import { ProjectHealthChecker } from '@ezstart/monitoring'
import type { Request, Response } from 'express'

export const router = Router()

const projectHealthChecker = new ProjectHealthChecker()

const listProjectsHandler = async (_: Request, res: Response) => {
  try {
    const environment =
      process.env.NODE_ENV === 'production' ? 'production' : 'local'
    const timeout = Number(process.env.HEALTH_CHECK_TIMEOUT) || 5000
    const retries = Number(process.env.HEALTH_CHECK_RETRIES) || 3

    const projects = await projectHealthChecker.checkAllProjects(environment, {
      timeout,
      retries,
    })

    res.json({
      projects,
      environment,
      summary: {
        total: projects.length,
        healthy: projects.filter(p => p.overallStatus === 'healthy').length,
        degraded: projects.filter(p => p.overallStatus === 'degraded').length,
        unhealthy: projects.filter(p => p.overallStatus === 'unhealthy').length,
      },
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check projects',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

router.get('/', listProjectsHandler)

export default router as ReturnType<typeof Router>
