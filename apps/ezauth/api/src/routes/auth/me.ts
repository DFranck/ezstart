import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { logger } from '@ezstart/logger/server'
import { userResponseSchema, errorResponseSchema } from '@ezstart/auth-sdk/server'

export const meRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(meRegistry, router)

// Get current user info — delegates token extraction to verifyTokenMiddleware
const meController = async (req: Request, res: Response) => {
  try {
    // verifyTokenMiddleware already verified the token and attached req.user
    // Re-fetch from DB via AuthService for consistency with other auth routes
    const user = await AuthService.getUserById(req.userId!)

    sendSuccess(res, { user })
  } catch (error) {
    logger.error('Get user error:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to fetch user', 500)
  }
}

docRouter.get('/me', verifyTokenMiddleware, meController, {
  summary: 'Get current user information',
  tags: ['User'],
  responseSchema: userResponseSchema,
  extraResponses: {
    401: { description: 'Invalid or missing token', schema: errorResponseSchema },
  },
})

export default router
