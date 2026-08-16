/**
 * GET /api/deployments/:id
 *
 * Get specific deployment details
 */

import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { DEPLOYMENT_CONFIGS } from '@ezstart/monitoring'
import { exec } from 'child_process'
import { promisify } from 'util'
import type { Request, Response } from 'express'

const execAsync = promisify(exec)

export const registry = new OpenAPIRegistry()
export const router: ReturnType<typeof Router> = Router()
const docRouter = createRouterWithDoc(registry, router)

const getDeploymentByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return sendError(res, 'Deployment ID is required', 400)
    }

    const config = DEPLOYMENT_CONFIGS[id]

    if (!config) {
      return sendError(res, 'Deployment not found', 404)
    }

    let commits: Array<{
      hash: string
      message: string
      author: string
      date: Date
    }> = []

    try {
      const { stdout } = await execAsync(
        `git log -10 --format="%H|%s|%an|%ai" -- ${config.repositoryPath}`
      )
      commits = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const parts = line.split('|')
          return {
            hash: (parts[0] || '').slice(0, 7),
            message: parts[1] || '',
            author: parts[2] || '',
            date: new Date(parts[3] || new Date().toISOString()),
          }
        })
    } catch (gitError) {
      logger.warn(`Failed to get git history for ${id}:`, gitError)
    }

    sendSuccess(res, {
      id,
      ...config,
      commits,
      status: 'active',
      healthStatus: 'unknown',
    })
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get deployment')
  }
}

router.get('/:id', getDeploymentByIdHandler)

export default router as ReturnType<typeof Router>
