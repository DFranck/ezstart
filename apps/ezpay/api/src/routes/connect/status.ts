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

const statusResponseSchema = z.object({
  success: z.boolean(),
  connectedAccount: z.record(z.unknown()).nullable(),
})

// ========================================
// Route Handler
// ========================================

const statusHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string
    const ConnectedAccount = await getConnectedAccountModel()
    const account = await ConnectedAccount.findOne({ userId }).lean()

    sendSuccess(res, { connectedAccount: account ?? null })
  } catch (error) {
    logger.error('Connect status error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to get connect status')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/connect/status', authMiddleware, populateUserFromToken, statusHandler, {
  summary: 'Get current user connected account status',
  tags: ['Connect'],
  responseSchema: statusResponseSchema,
})

export { statusRegistry as registry, router }
