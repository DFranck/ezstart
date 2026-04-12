import { createRouterWithDoc, OpenAPIRegistry, Router, sendError } from '@ezstart/express-core'
import type { Router as ExpressRouter, Request, Response, NextFunction } from 'express'
import { getWebUrl } from '@ezstart/config/urls'
import { getAllowedOrigins } from '@ezstart/config/cors'
import { logger } from '@ezstart/logger/server'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import passport, { verifyOAuthStateToken } from '../../config/passport.js'

export const googleCallbackRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(googleCallbackRegistry, router)

const OAUTH_STATE_COOKIE = 'oauth_state'

/** Check if a redirect URI's origin is in the allowed CORS origins or is localhost */
function isAllowedRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri)
    const origin = parsed.origin

    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true
    }

    const allowedOrigins = getAllowedOrigins('ezauth')
    return allowedOrigins.includes(origin)
  } catch {
    return false
  }
}

/**
 * CSRF gate: runs BEFORE passport.authenticate so we can reject forged callbacks
 * without ever hitting the OAuth service or the DB.
 */
function validateOAuthState(req: Request, res: Response, next: NextFunction) {
  const stateToken = typeof req.query.state === 'string' ? req.query.state : ''
  const cookieNonce: string | undefined = req.cookies?.[OAUTH_STATE_COOKIE]

  if (!stateToken || !cookieNonce) {
    logger.warn('[OAuth] Missing state token or state cookie on Google callback')
    return sendError(res, 'Invalid OAuth state', 400)
  }

  try {
    const claims = verifyOAuthStateToken(stateToken)
    if (claims.nonce !== cookieNonce) {
      logger.warn('[OAuth] OAuth state nonce mismatch on Google callback')
      return sendError(res, 'Invalid OAuth state', 400)
    }
  } catch (err) {
    logger.warn({ err }, '[OAuth] Failed to verify OAuth state token')
    return sendError(res, 'Invalid OAuth state', 400)
  }

  // One-shot: clear the cookie regardless of downstream outcome.
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/api/auth' })
  next()
}

/**
 * GET /auth/google/callback
 * Google OAuth callback — validates state, then lets Passport finish auth.
 */
docRouter.get(
  '/google/callback',
  validateOAuthState,
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login?error=oauth_failed',
  }),
  (req, res) => {
    const user = req.user as unknown as { authCode: string; redirect_uri?: string }

    if (!user || !user.authCode) {
      return res.redirect('/login?error=oauth_failed')
    }

    if (user.redirect_uri) {
      if (!isAllowedRedirectUri(user.redirect_uri)) {
        logger.warn(`OAuth callback blocked invalid redirect_uri: ${user.redirect_uri}`)
        return sendError(res, 'Invalid redirect_uri', 400)
      }

      const redirectUrl = new URL(user.redirect_uri)
      redirectUrl.searchParams.set('code', user.authCode)
      return res.redirect(redirectUrl.toString())
    }

    return res.redirect(`${getWebUrl('ezauth')}/auth/callback?code=${user.authCode}`)
  },
  {
    summary: 'Google OAuth callback',
    tags: ['OAuth'],
    extraResponses: {
      302: { description: 'Redirect to app with authorization code' },
      400: { description: 'Invalid redirect_uri or OAuth state', schema: errorResponseSchema },
    },
  }
)

export default router
