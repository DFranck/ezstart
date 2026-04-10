/**
 * GET /api/ai/usage/stats
 * Returns AI usage statistics (auth required)
 */

import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { z } from 'zod'
import { getUsageStats } from '../../../services/ai-usage.service.js'

const statsQuerySchema = z.object({
  appName: z.string().min(1).optional().describe('Filter by app name (omit for all apps)'),
  days: z.coerce.number().min(1).max(365).default(30).describe('Number of days to look back'),
})

export const usageStatsRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(usageStatsRegistry, router, '/usage')

docRouter.get(
  '/stats',
  async (req, res) => {
    try {
      const validation = statsQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
      }

      const { appName, days } = validation.data
      const stats = await getUsageStats(appName, days)

      sendSuccess(res, stats)
    } catch (error) {
      logger.error('[AI Usage] Stats error:', error)
      sendError(res, 'Failed to fetch usage stats')
    }
  },
  {
    summary: 'Get AI usage statistics',
    tags: ['AI Usage'],
  }
)

export default router
