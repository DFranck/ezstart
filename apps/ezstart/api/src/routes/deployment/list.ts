/**
 * GET /api/deployments
 *
 * Get all deployment configurations and status
 */

import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { DEPLOYMENT_CONFIGS } from '@ezstart/monitoring'
import { exec } from 'child_process'
import { promisify } from 'util'
import type { Request, Response } from 'express'

const execAsync = promisify(exec)

export const registry = new OpenAPIRegistry()
export const router: ReturnType<typeof Router> = Router()
const docRouter = createRouterWithDoc(registry, router)

const listDeploymentsHandler = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const offset = Math.max(Number(req.query.offset) || 0, 0)

    const allEntries = Object.entries(DEPLOYMENT_CONFIGS)
    const total = allEntries.length
    const paginatedEntries = allEntries.slice(offset, offset + limit)

    const deployments = await Promise.all(
      paginatedEntries.map(async ([id, config]) => {
        let lastCommit: {
          hash: string
          message: string
          author: string
          date: Date
        } | null = null

        try {
          const { stdout } = await execAsync(
            `git log -1 --format="%H|%s|%an|%ai" -- ${config.repositoryPath}`
          )
          if (stdout.trim()) {
            const parts = stdout.trim().split('|')
            const hash = parts[0] || ''
            const message = parts[1] || ''
            const author = parts[2] || ''
            const date = parts[3] || new Date().toISOString()

            lastCommit = {
              hash: hash.slice(0, 7),
              message,
              author,
              date: new Date(date),
            }
          }
        } catch (gitError) {
          logger.warn(`Failed to get git info for ${id}:`, gitError)
        }

        return {
          id,
          ...config,
          lastCommit,
          status: 'active' as const,
          healthStatus: 'unknown' as const,
        }
      })
    )

    sendSuccess(
      res,
      {
        deployments,
        summary: {
          total,
          railway: deployments.filter(d => d.platform === 'railway').length,
          vercel: deployments.filter(d => d.platform === 'vercel').length,
          active: deployments.filter(d => d.status === 'active').length,
        },
      },
      { total, limit, offset }
    )
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get deployments')
  }
}

router.get('/', listDeploymentsHandler)

export default router as ReturnType<typeof Router>
