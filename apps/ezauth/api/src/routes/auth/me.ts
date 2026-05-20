import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import { logger } from '@ezstart/logger/server'
import { userResponseSchema, errorResponseSchema } from '@ezstart/auth-sdk/server'
import { verifyTokenMiddleware as authMiddleware } from '../../middleware/auth.js'

export const meRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(meRegistry, router)

// Get current user info
const meController = async (req: Request, res: Response) => {
  try {
    const user = await AuthService.getUserById(req.userId!)

    sendSuccess(res, { user })
  } catch (error) {
    // MED-1 — never echo a raw `error.message` (Mongoose/DB internals leak).
    // Any error reaching here is unexpected; return a stable generic message.
    logger.error('Get user error:', error)
    sendError(res, 'Failed to fetch user', 500)
  }
}

docRouter.get('/me', authMiddleware, meController, {
  summary: 'Get current user information',
  tags: ['User'],
  responseSchema: userResponseSchema,
  extraResponses: {
    401: { description: 'Invalid or missing token', schema: errorResponseSchema },
  },
})

export default router
