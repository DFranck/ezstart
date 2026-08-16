/**
 * CSRF protection middleware factory.
 *
 * Generates a random token stored in a non-httpOnly cookie and echoed in
 * a response header. Mutating requests (POST, PUT, PATCH, DELETE) must
 * send the token back via the `X-CSRF-Token` header — mismatches are
 * rejected with `403`.
 */

import crypto from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import { sendError } from '../responses.js'

/**
 * Configuration options for {@link createCsrfMiddleware}.
 *
 * All fields are optional. Defaults are tuned for the common SSO-friendly
 * case (cross-origin top-level navigation must carry the cookie), matching
 * the cookie defaults documented in `.claude/rules/standard-saas-security.md`
 * §2 — "Session cookies httpOnly + Secure + SameSite=Lax".
 */
export interface CreateCsrfMiddlewareOptions {
  /**
   * Cookie name.
   * @default 'csrf-token'
   */
  cookieName?: string
  /**
   * Cookie domain. When omitted, the browser treats the cookie as host-only
   * (only sent to the exact origin that set it). Set this to `.example.com`
   * (or `'localhost'` in dev cross-port setups, cf. `.claude/rules/env.md` §7)
   * when the CSRF cookie must be shared across subdomains/ports.
   */
  domain?: string
  /**
   * SameSite policy.
   *
   * - `'lax'` (default) — cookie is sent on top-level GET navigations from
   *   other origins (e.g., SSO link clicks from email, OAuth callbacks).
   *   This is the industry default (Chromium, Firefox, Safari since 2020)
   *   and the safest choice for any SaaS that ever receives users via
   *   cross-origin links.
   * - `'strict'` — cookie is never sent on cross-origin requests, including
   *   top-level navigation. Maximum CSRF resistance but breaks SSO link
   *   clicks and any cross-origin nav that needs the token immediately.
   *   Opt into this only if the app NEVER receives users via cross-origin
   *   links (rare for end-user SaaS).
   * - `'none'` — cookie is sent on all cross-origin requests. Requires
   *   `secure: true` per the browser cookie spec (rejected otherwise).
   *   Only needed for embedded iframe / third-party widget scenarios.
   *
   * @default 'lax'
   */
  sameSite?: 'lax' | 'strict' | 'none'
  /**
   * Secure flag — when `true`, the cookie is only sent over HTTPS.
   * Defaults to `true` when `NODE_ENV === 'production'`, `false` otherwise.
   * Must be `true` when `sameSite === 'none'` (browser cookie spec).
   *
   * @default process.env.NODE_ENV === 'production'
   */
  secure?: boolean
}

/**
 * Build a pair of CSRF middlewares:
 * - `generateToken` — sets a `csrf-token` cookie + `X-CSRF-Token` header.
 * - `verifyToken` — validates the cookie/header pair on mutating methods.
 *
 * The default cookie policy is `SameSite=Lax`, which allows the cookie to
 * be sent on top-level cross-origin navigations (SSO link clicks, OAuth
 * callbacks). Apps that never receive users via cross-origin links may opt
 * into `sameSite: 'strict'` for additional CSRF resistance.
 *
 * **Behavior change (Wave B Lot 4, B4-E)**: the previous default was
 * `SameSite=Strict`. The default is now `'lax'` to match industry norms
 * (Chromium, Firefox, Safari default since 2020) and unblock SSO flows.
 * Pass `{ sameSite: 'strict' }` explicitly to restore the legacy behavior.
 *
 * @param options - Cookie configuration (cookieName, domain, sameSite, secure).
 *
 * @example
 * ```ts
 * import { createCsrfMiddleware } from '@ezstart/api-core'
 *
 * // Default — sameSite='lax', cookieName='csrf-token'
 * const csrf = createCsrfMiddleware()
 * app.use(csrf.generateToken)
 * app.use(csrf.verifyToken)
 * ```
 *
 * @example
 * ```ts
 * // Opt into strict cookies (app never receives users via cross-origin links)
 * const csrf = createCsrfMiddleware({ sameSite: 'strict' })
 * ```
 *
 * @example
 * ```ts
 * // Cross-subdomain CSRF cookie in production
 * const csrf = createCsrfMiddleware({
 *   domain: '.example.com',
 *   sameSite: 'lax',
 * })
 * ```
 */
export function createCsrfMiddleware(options?: CreateCsrfMiddlewareOptions) {
  const cookieName = options?.cookieName ?? 'csrf-token'
  const sameSite = options?.sameSite ?? 'lax'
  const secure = options?.secure ?? process.env.NODE_ENV === 'production'
  const domain = options?.domain

  // Browser cookie spec: SameSite=None requires Secure=true. Reject at
  // construction time so misconfiguration surfaces at boot, not at runtime
  // when the browser silently drops the cookie.
  if (sameSite === 'none' && !secure) {
    throw new Error(
      "createCsrfMiddleware: sameSite='none' requires secure=true (browser cookie spec)"
    )
  }

  const baseCookieOptions = {
    httpOnly: false,
    sameSite,
    secure,
    ...(domain !== undefined ? { domain } : {}),
  } as const

  return {
    generateToken: (req: Request, res: Response, next: NextFunction) => {
      const token = crypto.randomBytes(32).toString('hex')
      res.cookie(cookieName, token, baseCookieOptions)
      res.setHeader('X-CSRF-Token', token)
      next()
    },
    verifyToken: (req: Request, res: Response, next: NextFunction) => {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
      const cookies = req.cookies as Record<string, unknown> | undefined
      const rawCookieToken = cookies?.[cookieName]
      const cookieToken = typeof rawCookieToken === 'string' ? rawCookieToken : undefined
      const rawHeaderToken = req.headers['x-csrf-token']
      const headerToken = typeof rawHeaderToken === 'string' ? rawHeaderToken : undefined
      if (!cookieToken || !headerToken) {
        return sendError(res, 'CSRF token mismatch', 403)
      }

      // Timing-safe compare per .claude/rules/standard-saas-security.md §6.
      // crypto.timingSafeEqual throws if the buffers have different lengths,
      // so length-check first (different lengths = always mismatch, no info
      // leak because length is observable on the wire anyway via Content-Length).
      const cookieBuf = Buffer.from(cookieToken)
      const headerBuf = Buffer.from(headerToken)
      if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
        return sendError(res, 'CSRF token mismatch', 403)
      }

      next()
    },
  }
}
