import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/api-core'
import type { Router as ExpressRouter, Request, Response, NextFunction } from 'express'
import { getWebUrl } from '@ezstart/config/urls'
import { logger } from '@ezstart/logger/server'
import passport, { OAUTH_STATE_COOKIE, verifyOAuthStateToken } from '../../config/passport.js'
import { validateRedirectUriForApp } from '../../services/oauth-redirect-uri.service.js'

export const googleCallbackRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(googleCallbackRegistry, router)

/**
 * Build an absolute URL on the EZAuth web app that surfaces the given
 * OAuth error code on the login screen. Used everywhere we need to bail
 * out of the callback flow — never use a relative `/login?…` redirect on
 * an API route, the browser would resolve it against the API origin and
 * land the user on a 404.
 */
function loginErrorUrl(errorCode: string, message?: string): string {
  const base = getWebUrl('ezauth')
  const params = new URLSearchParams({ error: errorCode })
  if (message) params.set('message', message)
  return `${base}/login?${params.toString()}`
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
    return res.redirect(loginErrorUrl('oauth_state_missing'))
  }

  try {
    const claims = verifyOAuthStateToken(stateToken)
    if (claims.nonce !== cookieNonce) {
      logger.warn('[OAuth] OAuth state nonce mismatch on Google callback')
      return res.redirect(loginErrorUrl('oauth_state_mismatch'))
    }
  } catch (err) {
    logger.warn({ err }, '[OAuth] Failed to verify OAuth state token')
    return res.redirect(loginErrorUrl('oauth_state_invalid'))
  }

  // One-shot: clear the cookie regardless of downstream outcome.
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/api/auth' })
  next()
}

/**
 * Custom Passport invocation so we can surface domain-specific errors
 * (notably `OAuthLinkingRefusedError`) with their actionable message,
 * instead of swallowing every failure as a generic `oauth_failed`.
 */
function authenticateGoogle(req: Request, res: Response, next: NextFunction) {
  passport.authenticate(
    'google',
    { session: false },
    (err: unknown, user: Express.User | false | null) => {
      if (err) {
        const tagged = err as Error & { code?: string }
        // Domain-specific: account already exists (auto-link refused).
        if (tagged.code === 'OAUTH_LINKING_REFUSED') {
          logger.info({ message: tagged.message }, '[OAuth] Linking refused — redirecting user')
          return res.redirect(loginErrorUrl('oauth_linking_refused', tagged.message))
        }
        logger.warn({ err }, '[OAuth] Google authentication error')
        return res.redirect(loginErrorUrl('oauth_failed'))
      }
      if (!user) {
        // User denied consent on the Google screen, or Google returned an error.
        const providerError = typeof req.query.error === 'string' ? req.query.error : 'oauth_failed'
        logger.info({ providerError }, '[OAuth] Google authentication did not return a user')
        return res.redirect(loginErrorUrl(providerError))
      }
      // Passport returns the OAuth user shape from passport.ts done():
      // { authCode, redirect_uri }. We bypass the AuthenticatedUser typing
      // here because the callback handler reads it back via the same cast
      // — this route never goes through the standard `requireAuth`
      // middleware that would populate `userId`.
      ;(req as unknown as { user: unknown }).user = user
      next()
    }
  )(req, res, next)
}

/**
 * GET /auth/google/callback
 * Google OAuth callback — validates state, then lets Passport finish auth.
 */
docRouter.get(
  '/google/callback',
  validateOAuthState,
  authenticateGoogle,
  async (req, res) => {
    const user = req.user as unknown as { authCode: string; redirect_uri?: string }

    if (!user || !user.authCode) {
      return res.redirect(loginErrorUrl('oauth_failed'))
    }

    if (user.redirect_uri) {
      // HAC-HIGH-3 (RFC 6749 §3.1.2) — re-validate against the per-Application
      // allowlist at callback time. The same check ran in /google (authorize)
      // before kicking off the flow, but Google round-trips the original
      // redirect_uri verbatim inside our signed state, so a re-check here
      // closes the gap if the allowlist has been mutated between authorize
      // and callback (or if a future code path forwards a state we did not
      // pre-validate). The `app` is the slug we signed into the state JWT.
      const stateToken = typeof req.query.state === 'string' ? req.query.state : ''
      let appSlug = ''
      try {
        appSlug = verifyOAuthStateToken(stateToken).app
      } catch {
        // verifyOAuthStateToken was already gated by validateOAuthState — if
        // we reach this catch the token raced an expiry between the two
        // calls, which is exceptional but treated as a hard reject.
        return res.redirect(loginErrorUrl('oauth_state_invalid'))
      }
      const allowed = await validateRedirectUriForApp(appSlug, user.redirect_uri)
      if (!allowed) {
        logger.warn(
          { appSlug, redirectUri: user.redirect_uri },
          '[OAuth] callback blocked — redirect_uri not in Application.redirectUris'
        )
        return res.redirect(loginErrorUrl('oauth_invalid_redirect'))
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
      302: { description: 'Redirect to app with authorization code or login error' },
    },
  }
)

export default router
