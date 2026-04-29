import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendValidationError,
} from '@ezstart/api-core'
import type { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import passport, { OAUTH_STATE_COOKIE, signOAuthStateToken } from '../../config/passport.js'

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
})

/**
 * GET /auth/google
 * Initiate Google OAuth flow with a signed, CSRF-protected state token.
 */
docRouter.get(
  '/google',
  (req, res, next) => {
    const parsed = googleAuthorizeQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid query parameters', parsed.error.errors)
    }

    const { app, redirect_uri } = parsed.data

    // CSRF protection: generate a random nonce, stash it in a short-lived
    // httpOnly cookie AND embed it in a signed JWT used as the `state` param.
    // Callback will verify both match.
    const nonce = crypto.randomBytes(32).toString('hex')
    const stateToken = signOAuthStateToken({ nonce, app, redirectUri: redirect_uri })

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
    },
  }
)

export default router
