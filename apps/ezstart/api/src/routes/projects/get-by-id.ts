/**
 * GET /api/projects/:projectId
 *
 * Get health check for specific project
 */

import { Router } from '@ezstart/express-core'
import { ProjectHealthChecker } from '@ezstart/monitoring'
import type { Request, Response } from 'express'

export const router: ReturnType<typeof Router> = Router()

const projectHealthChecker = new ProjectHealthChecker()

const getProjectByIdHandler = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const environment =
      process.env.NODE_ENV === 'production' ? 'production' : 'local'
    const timeout = Number(process.env.HEALTH_CHECK_TIMEOUT) || 5000
    const retries = Number(process.env.HEALTH_CHECK_RETRIES) || 3

    const project = await projectHealthChecker.checkProject(
      projectId as any,
      environment,
      {
        timeout,
        retries,
      }
    )

    res.json(project)
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check project',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

router.get('/:projectId', getProjectByIdHandler)

export default router as ReturnType<typeof Router>
