/**
 * GET /api/deployments/:id
 *
 * Get specific deployment details
 */

import { logger } from '@ezstart/logger/server'
import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
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
      return res.status(400).json({ error: 'Deployment ID is required' })
    }

    const config = DEPLOYMENT_CONFIGS[id]

    if (!config) {
      return res.status(404).json({ error: 'Deployment not found' })
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

    res.json({
      id,
      ...config,
      commits,
      status: 'active',
      healthStatus: 'unknown',
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get deployment',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

router.get('/:id', getDeploymentByIdHandler)

export default router as ReturnType<typeof Router>
