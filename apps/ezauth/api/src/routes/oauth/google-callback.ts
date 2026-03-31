import { Router } from '@ezstart/express-core'
import type { Router as ExpressRouter } from 'express'
import { getWebUrl } from '@ezstart/config/urls'
import { getAllowedOrigins } from '@ezstart/config/cors'
import { logger } from '@ezstart/logger/server'
import passport from '../../config/passport.js'

const router: ExpressRouter = Router()

/** Check if a redirect URI's origin is in the allowed CORS origins or is localhost */
function isAllowedRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri)
    const origin = parsed.origin

    // Allow localhost (any port) for development
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true
    }

    // Check against CORS-allowed origins for ezauth
    const allowedOrigins = getAllowedOrigins('ezauth')
    return allowedOrigins.includes(origin)
  } catch {
    return false
  }
}

/**
 * GET /auth/google/callback
 * Google OAuth callback
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  (req, res) => {
    const user = req.user as unknown as { authCode: string; redirect_uri?: string }

    if (!user || !user.authCode) {
      return res.redirect('/login?error=oauth_failed')
    }

    // Redirect back to app with auth code
    if (user.redirect_uri) {
      if (!isAllowedRedirectUri(user.redirect_uri)) {
        logger.warn(`OAuth callback blocked invalid redirect_uri: ${user.redirect_uri}`)
        return res.status(400).json({ error: 'Invalid redirect_uri' })
      }

      const redirectUrl = new URL(user.redirect_uri)
      redirectUrl.searchParams.set('code', user.authCode)
      return res.redirect(redirectUrl.toString())
    }

    // Fallback: redirect to EZAuth web with code
    return res.redirect(`${getWebUrl('ezauth')}/auth/callback?code=${user.authCode}`)
  }
)

export default router
