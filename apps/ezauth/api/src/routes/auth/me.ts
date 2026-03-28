import { createRouterWithDoc, OpenAPIRegistry, Router, sendError } from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import { logger } from '@ezstart/logger/server'
import {
  userResponseSchema,
  errorResponseSchema
} from '@ezstart/auth-sdk/server'

export const meRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(meRegistry, router)

// Get current user info (DUAL-MODE: supports httpOnly cookie + Authorization header)
const meController = async (req: any, res: any) => {
  try {
    // Try httpOnly cookie first
    let token = req.cookies?.ezauth_token

    // Fallback to Authorization header (localStorage mode)
    if (!token) {
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return sendError(res, 'No token provided', 401)
    }

    const payload = await AuthService.verifyToken(token)
    const user = await AuthService.getUserById(payload.userId)

    res.json({
      success: true,
      user
    })
  } catch (error) {
    logger.error('Get user error:', error)
    sendError(res, error instanceof Error ? error.message : 'Invalid token', 401)
  }
}

docRouter.get('/me', meController, {
  summary: 'Get current user information',
  tags: ['User'],
  responseSchema: userResponseSchema,
  extraResponses: {
    401: { description: 'Invalid or missing token', schema: errorResponseSchema }
  }
})

export default router
