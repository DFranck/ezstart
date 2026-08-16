/**
 * Conditional CSRF guard.
 *
 * CSRF attacks only apply to cookie-authenticated requests (the browser
 * auto-sends the cookie on a cross-origin form POST). When the client
 * uses `Authorization: Bearer <token>`, it must have explicit JS access
 * to the token, so CSRF doesn't apply.
 *
 * This middleware runs the standard double-submit CSRF check ONLY when
 * the request is cookie-authenticated (no Authorization header but an
 * ezauth_token cookie is present). Bearer-auth requests pass through.
 *
 * Generating a CSRF token: clients call `GET /api/auth/login-cookie/csrf`
 * (existing endpoint) which sets the `csrf-token` cookie + `X-CSRF-Token`
 * response header. Subsequent state-changing requests must echo the token
 * via the `X-CSRF-Token` request header.
 */

import type { Request, Response, NextFunction } from 'express'
import { createCsrfMiddleware } from '@ezstart/api-core'
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../config/cookie.js'

const standardCsrf = createCsrfMiddleware()

/**
 * Trusted origins — a JS `fetch` whose `Origin` matches one of these is treated
 * as a same-party request, so the double-submit CSRF token check is SKIPPED.
 *
 * HARD RULE (HIGH-1, Wave D Lot 3.5A): we may ONLY Origin-trust a host whose
 * registration we control EXCLUSIVELY via DNS. The browser cannot let a script
 * spoof `Origin`, so trusting an origin is equivalent to trusting whoever can
 * register that hostname. That's safe for:
 *  - `localhost` (dev only, never reachable cross-internet),
 *  - `*.ezstart.xyz` (we own the apex — only we mint subdomains),
 *  - `*.ai-greenpulse.com` (monorepo-owned custom domain — same guarantee),
 *  - the Railway project hosts (`<app>-api[-staging].up.railway.app`) which
 *    Railway scopes to our project.
 *
 * It is NOT safe for `*.vercel.app`: that suffix is a SHARED public suffix.
 * `pwn-ezstart.vercel.app` is a perfectly registerable Vercel project name for
 * ANY attacker — the previous `[a-z0-9-]+-ezstart\.vercel\.app` pattern trusted
 * it, opening fire-and-forget CSRF on admin/account routes.
 *
 * ── SECURITY DEBT HIGH-1 (stopgap, must be fully removed) ────────────────────
 * We CANNOT yet drop vercel.app entirely: `@ezstart/auth-sdk` does NOT send the
 * double-submit `X-CSRF-Token` header on cookie-auth state-changing requests
 * (it relies on `credentials: 'include'` + Origin-trust). Removing vercel.app
 * would break the staging deploys the team tests on
 * (`<app>-git-staging-ezstart.vercel.app`). So we keep the TIGHTEST POSSIBLE
 * pin: ONLY the exact staging git-branch URL of a KNOWN app slug. This shrinks
 * the registerable-name surface from "any `*-ezstart` project" to "exactly
 * `<known-app>-git-staging-ezstart`". It is still a public-suffix host, hence
 * still debt: the REAL fix is to make the SDK always send the CSRF token on
 * cookie-auth writes, after which this vercel.app entry is deleted and ALL
 * cross-origin cookie-auth requests go through `verifyToken`.
 * Tracking: escalated to the auth-sdk agent (SDK-CSRF-TOKEN-ALWAYS-001).
 * ─────────────────────────────────────────────────────────────────────────────
 */
const KNOWN_APP_SLUGS = '(?:ezauth|ezbill|ezpay|ezstart|green-pulse|fengshui|gacha-analyzer)'
const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.ezstart\.xyz$/,
  // SECURITY DEBT HIGH-1 — pinned to the EXACT staging git-branch URL only.
  // NOT a general `*-ezstart.vercel.app` match (that trusts attacker-registerable
  // project names like `pwn-ezstart`). Remove once the SDK always sends the token.
  new RegExp(`^https://${KNOWN_APP_SLUGS}-git-staging-ezstart\\.vercel\\.app$`),
  /^https:\/\/[a-z0-9-]+\.ai-greenpulse\.com$/,
  /^https:\/\/(ezauth|ezbill|ezpay|ezstart|greenpulse|gacha-analyzer)-api(-staging)?\.up\.railway\.app$/,
]

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin))
}

/**
 * Apply CSRF verification only when the request carries an ezauth auth
 * cookie (access OR refresh). Bearer-token requests skip — they require
 * explicit JS access to the token, so CSRF doesn't apply. Unauthenticated
 * requests also pass through; downstream auth middleware handles rejection.
 */
export function verifyCookieCsrf(req: Request, res: Response, next: NextFunction) {
  // Bearer auth — not a CSRF vector
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next()
  }

  const hasAuthCookie = Boolean(
    req.cookies?.[ACCESS_COOKIE_NAME] || req.cookies?.[REFRESH_COOKIE_NAME]
  )
  if (!hasAuthCookie) {
    return next()
  }

  // Same-origin JS fetch — the Origin header proves the request comes from
  // our own frontend (browsers enforce Origin on cross-origin fetches and
  // never allow scripts to spoof it). Safe to skip double-submit CSRF.
  const origin = req.headers.origin
  if (origin && isAllowedOrigin(origin)) {
    return next()
  }

  return standardCsrf.verifyToken(req, res, next)
}

export const csrfHelpers = standardCsrf
