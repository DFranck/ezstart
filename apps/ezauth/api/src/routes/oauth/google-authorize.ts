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
import {
  errorResponseSchema,
  PkceCodeChallengeSchema,
  PkceCodeChallengeMethodSchema,
} from '@ezstart/auth-sdk/server'
import { logger } from '@ezstart/logger/server'
import { getWebUrl, type AppName } from '@ezstart/config/urls'
import passport, { OAUTH_STATE_COOKIE, signOAuthStateToken } from '../../config/passport.js'
import { JWT_SECRET } from '../../config/env.js'
import { JWT_ISSUER, JWT_VERIFIER_AUDIENCE } from '../../config/jwt.js'
import { ACCESS_COOKIE_NAME } from '../../config/cookie.js'
import { validateRedirectUriForApp } from '../../services/oauth-redirect-uri.service.js'

/**
 * RFC 6749 §3.1.2.4 default redirect URI.
 *
 * When the OAuth client OMITS `redirect_uri` at `/authorize`, the
 * Authorization Server MUST fall back to a single registered default URI.
 * Our default = the canonical web-app callback URL for the requesting `app`
 * in the current environment (`${getWebUrl(app)}/auth/callback`, no locale
 * prefix — locale is handled by the framework middleware at render time).
 *
 * Returns `undefined` when `app` is not a known `AppName` (third-party SaaS
 * consumers we don't ship URLs for). The caller treats that as "no default
 * available" and proceeds without storing a `redirectUri` on the auth code
 * — the legacy pre-RFC behavior, still secure because the /token endpoint
 * mirrors the absent-redirect-uri policy.
 */
export function getDefaultRedirectUriForApp(app: string): string | undefined {
  // `getWebUrl` only accepts the closed `AppName` union; for any unknown app
  // (external SaaS consumer the platform doesn't host) we can't synthesize
  // a default — return undefined and let the flow run sans redirect_uri.
  const knownApps: ReadonlyArray<AppName> = [
    'ezstart',
    'ezauth',
    'ezbill',
    'ezpay',
    'fengshui',
    'asc-tcd',
    'green-pulse',
    'gacha-analyzer',
  ]
  if (!knownApps.includes(app as AppName)) return undefined
  try {
    return `${getWebUrl(app as AppName)}/auth/callback`
  } catch {
    return undefined
  }
}

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
  // PKCE (RFC 7636 / OAuth 2.1) — OPTIONAL + strictly additive. When the SDK
  // commits to a `code_verifier` (stashed in sessionStorage before the
  // redirect to Google), it sends the derived `code_challenge` + S256 method
  // here. We sign BOTH into the state JWT so they round-trip through Google
  // tamper-proof; the callback then mints an auth code bound to the challenge.
  // Omitting both keeps the legacy (no-PKCE) OAuth behaviour. The shared
  // schemas reject `plain` (S256-only) and bound the charset/length.
  //
  // No `.openapi()` here: these schemas come from `@ezstart/api-contracts`
  // (a different zod instance) so re-decorating them locally breaks type
  // inference. The OpenAPI doc still describes the two params via the
  // `description` field on the schemas themselves.
  code_challenge: PkceCodeChallengeSchema.optional(),
  code_challenge_method: PkceCodeChallengeMethodSchema.optional(),
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
  async (req, res, next) => {
    const parsed = googleAuthorizeQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid query parameters', parsed.error.errors)
    }

    const { app, redirect_uri, intent, code_challenge, code_challenge_method } = parsed.data

    // HAC-HIGH-3 (RFC 6749 §3.1.2) — when the caller supplied a
    // `redirect_uri`, it MUST match one of the registered URIs on this
    // Application EXACTLY. We validate before kicking off the Google flow
    // so attacker-controlled URIs never reach Google's consent screen with
    // a victim's `state`. An absent `redirect_uri` falls back to the
    // server-side default (RFC 6749 §3.1.2.4) computed from `getWebUrl(app)`
    // — the bypass is server-controlled, never an attacker-supplied value,
    // so it does NOT need to clear the allowlist check.
    if (redirect_uri !== undefined) {
      const allowed = await validateRedirectUriForApp(app, redirect_uri)
      if (!allowed) {
        return sendError(
          res,
          'invalid_redirect_uri — does not match any registered URI for this Application',
          400
        )
      }
    }

    // RFC 6749 §3.1.2.4 — when no `redirect_uri` was sent, fall back to the
    // canonical web-app callback for `app` in the current environment. This
    // value is signed into the state JWT, mirrored onto the auth code at
    // mint time (via Passport → handleOAuthCallback → generateAuthCodePublic
    // → AuthCode.redirectUri), and re-checked at /token exchange (HAC-HIGH-4
    // strict equality). Without this fallback, /token would store
    // `undefined` and reject any client that does send `redirect_uri` at
    // exchange time (which all our SDKs do via `ctx.redirectUri`).
    const resolvedRedirectUri = redirect_uri ?? getDefaultRedirectUriForApp(app)

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
      redirectUri: resolvedRedirectUri,
      intent: intent ?? 'signin',
      linkUserId,
      // PKCE (RFC 7636) — sign the challenge INTO the state so it round-trips
      // through Google tamper-proof. Only when the SDK supplied one; the
      // method defaults to S256 (the schema rejects any other value, so this
      // only normalizes an absent method when a challenge IS present).
      ...(code_challenge
        ? { codeChallenge: code_challenge, codeChallengeMethod: code_challenge_method ?? 'S256' }
        : {}),
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
