import { Router } from '@ezstart/express-core'
import type { Router as ExpressRouter } from 'express'
import passport from '../../config/passport.js'

const router: ExpressRouter = Router()

/**
 * GET /auth/google
 * Initiate Google OAuth flow
 * Query params: app, redirect_uri
 */
router.get('/google', (req, res, next) => {
  const { app = 'ezstart', redirect_uri } = req.query

  // Pass app and redirect_uri via state parameter
  const state = JSON.stringify({ app, redirect_uri })

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
  })(req, res, next)
})

export default router
