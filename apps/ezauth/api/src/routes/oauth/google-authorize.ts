import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import type { Router as ExpressRouter, Request } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import type { JWTPayload } from '@ezstart/auth-sdk/server'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import { logger } from '@ezstart/logger/server'
import passport, { OAUTH_STATE_COOKIE, signOAuthStateToken } from '../../config/passport.js'
import { JWT_SECRET } from '../../config/env.js'
import { JWT_ISSUER, JWT_VERIFIER_AUDIENCE } from '../../config/jwt.js'
import { ACCESS_COOKIE_NAME } from '../../config/cookie.js'

export const googleAuthorizeRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(googleAuthorizeRegistry, router)

const googleAuthorizeQuerySchema = z.object({
  app: z
    .string()
    .min(1, 'app query parameter is required')
    .openapi({ description: 'Application name requesting OAuth (required)' }),
  redirect_uri: z
    .string()
    .url()
    .optional()
    .openapi({ description: 'URL to redirect after OAuth completion' }),
  intent: z.enum(['signin', 'link']).optional().openapi({
    description:
      'Flow intent — `link` requires the caller to already be signed in (cookie session) and links the OAuth provider to the current user instead of refusing on email collision.',
  }),
})

/**
 * Best-effort extraction of a session userId from the request — checks
 * Authorization Bearer header first, then the access cookie. Returns
 * `undefined` for any verification failure (expired, malformed, missing).
 */
function extractCurrentUserId(req: Request): string | undefined {
  const authHeader = req.headers.authorization
  let token: string | undefined
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME]
    if (typeof cookieToken === 'string' && cookieToken.length > 0) {
      token = cookieToken
    }
  }
  if (!token) return undefined
  try {
    // HAC-CRIT-2 — enforce iss/aud so a cross-API token cannot resolve
    // a userId via this best-effort helper.
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_VERIFIER_AUDIENCE,
    }) as unknown as JWTPayload
    return payload.userId
  } catch {
    return undefined
  }
}

/**
 * GET /auth/google
 * Initiate Google OAuth flow with a signed, CSRF-protected state token.
 *
 * - `intent=signin` (default) — standard OAuth login / signup
 * - `intent=link`             — caller MUST be authenticated; the OAuth
 *   provider is linked to the current session's user instead of being
 *   refused on email collision (the typical "Connect Google account from
 *   settings" flow)
 */
docRouter.get(
  '/google',
  (req, res, next) => {
    const parsed = googleAuthorizeQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid query parameters', parsed.error.errors)
    }

    const { app, redirect_uri, intent } = parsed.data

    let linkUserId: string | undefined
    if (intent === 'link') {
      linkUserId = extractCurrentUserId(req)
      if (!linkUserId) {
        logger.warn('[OAuth] intent=link requested without an authenticated session')
        return sendError(res, 'Authentication required to link an OAuth provider', 401)
      }
    }

    // CSRF protection: generate a random nonce, stash it in a short-lived
    // httpOnly cookie AND embed it in a signed JWT used as the `state` param.
    // Callback will verify both match.
    const nonce = crypto.randomBytes(32).toString('hex')
    const stateToken = signOAuthStateToken({
      nonce,
      app,
      redirectUri: redirect_uri,
      intent: intent ?? 'signin',
      linkUserId,
    })

    res.cookie(OAUTH_STATE_COOKIE, nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000, // 5 minutes — matches JWT TTL
      path: '/api/auth',
    })

    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: stateToken,
    })(req, res, next)
  },
  {
    summary: 'Initiate Google OAuth flow',
    tags: ['OAuth'],
    querySchema: googleAuthorizeQuerySchema,
    extraResponses: {
      302: { description: 'Redirect to Google consent screen' },
      400: { description: 'Invalid query parameters', schema: errorResponseSchema },
      401: {
        description: 'Authentication required for intent=link',
        schema: errorResponseSchema,
      },
    },
  }
)

export default router
