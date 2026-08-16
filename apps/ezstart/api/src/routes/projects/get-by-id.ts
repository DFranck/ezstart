/**
 * GET /api/projects/:projectId
 *
 * Get health check for specific project
 */

import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import { ProjectHealthChecker } from '@ezstart/monitoring'
import type { ProjectId } from '@ezstart/monitoring'
import type { Request, Response } from 'express'

export const router: ReturnType<typeof Router> = Router()

const projectHealthChecker = new ProjectHealthChecker()

const getProjectByIdHandler = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const environment = process.env.NODE_ENV === 'production' ? 'production' : 'local'
    const timeout = Number(process.env.HEALTH_CHECK_TIMEOUT) || 5000
    const retries = Number(process.env.HEALTH_CHECK_RETRIES) || 3

    const project = await projectHealthChecker.checkProject(projectId as ProjectId, environment, {
      timeout,
      retries,
    })

    sendSuccess(res, project)
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to check project')
  }
}

router.get('/:projectId', getProjectByIdHandler)

export default router as ReturnType<typeof Router>
