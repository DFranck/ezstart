import { Router } from '@ezstart/express-core'
import type { Router as ExpressRouter } from 'express'
import passport from '../config/passport.js'

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

/**
 * GET /auth/google/callback
 * Google OAuth callback
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  (req, res) => {
    const user = req.user as { authCode: string; redirect_uri?: string }

    if (!user || !user.authCode) {
      return res.redirect('/login?error=oauth_failed')
    }

    // Redirect back to app with auth code
    if (user.redirect_uri) {
      const redirectUrl = new URL(user.redirect_uri)
      redirectUrl.searchParams.set('code', user.authCode)
      return res.redirect(redirectUrl.toString())
    }

    // Fallback: redirect to EZAuth web with code
    return res.redirect(`http://localhost:5015/auth/callback?code=${user.authCode}`)
  }
)

export default router
