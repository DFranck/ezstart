/**
 * GET /api/activity/errors
 *
 * Fetch only error logs from Sentry
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import { createSentryClient } from '@ezstart/monitoring'
import type { Request, Response } from 'express'
import { z } from 'zod'

const errorsQuerySchema = z.object({
  project: z.string().optional().describe('Filter by project slug'),
  limit: z.coerce.number().default(50).describe('Max number of errors'),
  offset: z.coerce.number().default(0).describe('Number of items to skip'),
  since: z.string().default('7d').describe('Relative time or ISO timestamp'),
})

export const router: ReturnType<typeof Router> = Router()

const getErrorsHandler = async (req: Request, res: Response) => {
  try {
    const parsed = errorsQuerySchema.safeParse(req.query)
    const {
      project,
      limit = 50,
      offset = 0,
      since = '7d',
    } = parsed.success ? parsed.data : (req.query as Record<string, string>)

    const sentryClient = createSentryClient()
    if (!sentryClient) {
      return sendError(
        res,
        'Sentry integration not configured (SENTRY_AUTH_TOKEN not provided)',
        503
      )
    }

    const issues = await sentryClient.fetchIssues({
      project,
      status: 'unresolved',
      limit: Number(limit) + Number(offset),
      since,
    })

    const allErrorLogs = sentryClient.issuesToActivityLogs(issues)
    const total = allErrorLogs.length
    const errorLogs = allErrorLogs.slice(Number(offset), Number(offset) + Number(limit))

    sendSuccess(res, errorLogs, { total, limit: Number(limit), offset: Number(offset) })
  } catch (error) {
    logger.error('[Activity] Error fetching Sentry errors:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to fetch Sentry errors')
  }
}

router.get('/errors', getErrorsHandler)

export default router as ReturnType<typeof Router>
