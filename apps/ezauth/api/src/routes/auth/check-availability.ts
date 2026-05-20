import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createRateLimiter,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { getAuthUserModel } from '../../models/auth-user.js'
import { logger } from '@ezstart/logger/server'

export const checkAvailabilityRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(checkAvailabilityRegistry, router)

const rateLimiter = createRateLimiter()

// GET /auth/check-availability?email=...&username=...
const checkAvailabilityController = async (req: Request, res: Response) => {
  try {
    const { email, username } = req.query

    if (!email && !username) {
      return sendError(res, 'At least one of email or username is required', 400)
    }

    const AuthUserModel = await getAuthUserModel()
    const result: { emailAvailable?: boolean; usernameAvailable?: boolean } = {}

    if (email && typeof email === 'string') {
      const existingEmail = await AuthUserModel.findOne({
        email: email.toLowerCase().trim(),
      }).select('_id')
      result.emailAvailable = !existingEmail
    }

    if (username && typeof username === 'string') {
      const existingUsername = await AuthUserModel.findOne({
        username: username.trim(),
      }).select('_id')
      result.usernameAvailable = !existingUsername
    }

    sendSuccess(res, result)
  } catch (error) {
    // MED-1 — generic message; raw error.message would leak DB internals.
    logger.error('Check availability error:', error)
    sendError(res, 'Availability check failed', 500)
  }
}

docRouter.get('/check-availability', rateLimiter, checkAvailabilityController, {
  summary: 'Check email/username availability',
  tags: ['Authentication'],
})

export default router
