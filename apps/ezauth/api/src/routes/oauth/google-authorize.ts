import { Router, sendValidationError } from '@ezstart/express-core'
import type { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import passport from '../../config/passport.js'

const router: ExpressRouter = Router()

const googleAuthorizeQuerySchema = z.object({
  app: z.string().min(1).default('ezstart'),
  redirect_uri: z.string().url().optional(),
})

/**
 * GET /auth/google
 * Initiate Google OAuth flow
 * Query params: app, redirect_uri
 */
router.get('/google', (req, res, next) => {
  const parsed = googleAuthorizeQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return sendValidationError(res, 'Invalid query parameters', parsed.error.errors)
  }

  const { app, redirect_uri } = parsed.data

  // Pass app and redirect_uri via state parameter
  const state = JSON.stringify({ app, redirect_uri })

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
  })(req, res, next)
})

export default router
