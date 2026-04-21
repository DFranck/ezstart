import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { getConnectedAccountModel } from '../../models/ConnectedAccount.js'
import { authMiddleware, populateUserFromToken } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const statusRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(statusRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const statusQuerySchema = z.object({
  applicationId: z
    .string()
    .min(1)
    .optional()
    .describe('Scope the response to a single Application'),
})

const statusResponseSchema = z.object({
  success: z.boolean(),
  connectedAccount: z.record(z.unknown()).nullable().optional(),
  connectedAccounts: z.array(z.record(z.unknown())).optional(),
})

// ========================================
// Route Handler
// ========================================

const statusHandler = async (req: Request, res: Response) => {
  try {
    const queryValidation = statusQuerySchema.safeParse(req.query)
    if (!queryValidation.success) {
      return sendError(res, 'Invalid query', 400)
    }

    const userId = req.userId as string
    const { applicationId } = queryValidation.data
    const ConnectedAccount = await getConnectedAccountModel()

    if (applicationId) {
      // Scoped lookup — return the single account for this Application, if any.
      const account = await ConnectedAccount.findOne({ applicationId, userId }).lean()
      return sendSuccess(res, { connectedAccount: account ?? null })
    }

    // No scope — return every ConnectedAccount owned by this user (one per app
    // they own).
    const accounts = await ConnectedAccount.find({ userId }).lean()
    sendSuccess(res, { connectedAccounts: accounts })
  } catch (error) {
    logger.error('Connect status error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to get connect status')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/connect/status', authMiddleware, populateUserFromToken, statusHandler, {
  summary:
    "Get connected accounts for the current user — scoped by ?applicationId= or list all the user's accounts",
  tags: ['Connect'],
  querySchema: statusQuerySchema,
  responseSchema: statusResponseSchema,
})

export { statusRegistry as registry, router }
export default router
