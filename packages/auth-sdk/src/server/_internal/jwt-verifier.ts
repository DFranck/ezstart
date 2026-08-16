/**
 * JWT (cookie / Bearer) verifier for the unified auth middleware.
 *
 * Extracted from `auth-middleware.ts` (Wave D Lot 4). Token extraction +
 * `jwt.verify` (HS256, with HAC-CRIT-2 iss/aud enforcement when configured) +
 * user attachment, returning a tri-state result the skeleton drives:
 *   - `null`                       → no token present (fall through to API key)
 *   - `{ ok: true }`               → authenticated, user attached
 *   - `{ ok: false, responded }`   → rejected (`responded` = a body was sent)
 *
 * Behaviour is byte-identical to the inline closures — only relocated. The
 * iss/aud options are passed in already-normalised (see
 * `./jwt-verify-options.ts`); do NOT loosen the verify call.
 *
 * **Server-only.** Imported only by sibling `server/` modules.
 *
 * @internal
 * @module @ezstart/auth-sdk/server/_internal/jwt-verifier
 */

import './server-only.js'

import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { JWTPayload } from '../../core/types.js'
import type { AuthMiddlewareLogger } from './auth-middleware-types.js'
import { sendErrorEnvelope } from './error-envelope.js'

/** Tri-state outcome of the JWT path. `null` = no token → fall through. */
export type JwtResult = { ok: true } | { ok: false; responded: boolean } | null

/** Dependencies the JWT verifier closes over — supplied once by the factory. */
export interface JwtVerifierContext {
  jwtSecret: string
  cookieName: string
  verifyIssuer: jwt.VerifyOptions['issuer'] | undefined
  verifyAudience: jwt.VerifyOptions['audience'] | undefined
  attachUserToRequest: (req: Request, userId: string) => Promise<boolean>
  log: AuthMiddlewareLogger
}

function extractJwtToken(req: Request, cookieName: string): string | undefined {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  const cookieToken = (req as unknown as { cookies?: Record<string, string> }).cookies?.[cookieName]
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken
  }
  return undefined
}

/**
 * Build the `verifyJwt` closure bound to the supplied context. Returned
 * function signature + semantics match the previous inline implementation.
 */
export function createJwtVerifier(
  ctx: JwtVerifierContext
): (req: Request, res: Response) => Promise<JwtResult> {
  return async function verifyJwt(req: Request, res: Response): Promise<JwtResult> {
    const token = extractJwtToken(req, ctx.cookieName)
    if (!token) return null

    try {
      // HAC-CRIT-2 — enforce iss/aud when configured so a cross-API token
      // (or one forged outside the legitimate sign path) is rejected by
      // `jwt.verify` itself with `JsonWebTokenError`. Both options omitted
      // when undefined to keep back-compat behaviour for consumers that
      // haven't migrated.
      const payload = jwt.verify(token, ctx.jwtSecret, {
        algorithms: ['HS256'],
        ...(ctx.verifyIssuer !== undefined ? { issuer: ctx.verifyIssuer } : {}),
        ...(ctx.verifyAudience !== undefined ? { audience: ctx.verifyAudience } : {}),
      }) as unknown as JWTPayload

      const attached = await ctx.attachUserToRequest(req, payload.userId)
      if (!attached) {
        sendErrorEnvelope(res, 'User not found', 401, { code: 'USER_NOT_FOUND' })
        return { ok: false, responded: true }
      }
      return { ok: true }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'JsonWebTokenError') {
        sendErrorEnvelope(res, 'Invalid token', 401, { code: 'INVALID_TOKEN' })
        return { ok: false, responded: true }
      }
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        sendErrorEnvelope(res, 'Token expired', 401, { code: 'TOKEN_EXPIRED' })
        return { ok: false, responded: true }
      }
      ctx.log.error('[auth-sdk] unified-auth JWT verifier error', error)
      sendErrorEnvelope(res, 'Authentication failed', 500, { code: 'AUTH_INTERNAL_ERROR' })
      return { ok: false, responded: true }
    }
  }
}
