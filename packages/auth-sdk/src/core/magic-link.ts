/**
 * Core magic-link client methods — agnostic, framework-free.
 *
 * Standard ref: `.claude/rules/standard-saas-security.md` §6 (token replay,
 * anti-enumeration).
 */

import { cookieWrite } from './auth-client/cookie-write.js'
import { createCsrfHelper } from './auth-client/csrf.js'
import { AuthError } from './errors.js'

interface RequestMagicLinkOptions {
  /** Base API URL — must include `/api/auth` (same convention as `CoreAuthClient`). */
  apiUrl: string
  /** Email to send the link to. */
  email: string
  /** App context for session issuance + post-login redirect. */
  app?: string
  /** Optional override for where the user lands after sign-in. */
  redirectUri?: string
  /** Locale for the email body. */
  locale?: 'en' | 'fr' | 'vi' | string
}

interface RequestMagicLinkResult {
  /** Generic anti-enumeration message — same response whether the user exists or not. */
  message: string
}

interface VerifyMagicLinkOptions {
  apiUrl: string
  /** Token from the link `?token=` query param. */
  token: string
}

interface VerifyMagicLinkResult {
  message: string
  user: {
    _id: string
    email: string
    username: string
  }
  /** URL the client should navigate to after a successful sign-in. */
  redirectTo: string
}

/** @internal */
function unwrap<T>(body: Record<string, unknown>): T {
  if ('data' in body && body.data !== undefined) {
    return body.data as T
  }
  return body as T
}

/** @internal */
function parseError(body: Record<string, unknown>, fallback: string): string {
  if (body.error && typeof body.error === 'object') {
    const errObj = body.error as Record<string, unknown>
    if (typeof errObj.message === 'string') return errObj.message
  }
  if (typeof body.error === 'string') return body.error
  if (typeof body.message === 'string') return body.message
  return fallback
}

/**
 * Request a magic-link sign-in email. The response is intentionally
 * generic (anti-enumeration): a successful 200 means "if an account
 * exists, an email was sent" — it never differentiates known vs
 * unknown emails.
 *
 * @example
 * ```ts
 * await requestMagicLink({
 *   apiUrl: 'https://auth.example.com/api/auth',
 *   email: 'me@example.com',
 *   app: 'myapp',
 *   locale: 'en',
 * })
 * ```
 */
export async function requestMagicLink(
  opts: RequestMagicLinkOptions
): Promise<RequestMagicLinkResult> {
  const body: Record<string, unknown> = { email: opts.email }
  if (opts.app !== undefined) body.app = opts.app
  if (opts.redirectUri !== undefined) body.redirect_uri = opts.redirectUri
  if (opts.locale !== undefined) body.locale = opts.locale

  // Route through the centralized `cookieWrite` helper so the same-origin
  // cookie-auth path attaches the double-submit `X-CSRF-Token` header (priming
  // the cookie on cache miss + retrying once on a 403 mismatch). A raw `fetch`
  // with `credentials: 'include'` here would be CSRF-vulnerable — the browser
  // sends any session cookie automatically but never the CSRF header. The
  // standalone function owns no API key, so `baseHeaders` just passes extras
  // through.
  const baseHeaders = (extra?: Record<string, string>): Record<string, string> => ({ ...extra })
  const csrf = createCsrfHelper({ apiUrl: opts.apiUrl, baseHeaders })

  const response = await cookieWrite(
    { apiUrl: opts.apiUrl, baseHeaders, csrf },
    '/magic-link/request',
    { method: 'POST', body: JSON.stringify(body) }
  )

  const result = await response.json()
  if (!response.ok) {
    throw new AuthError(parseError(result, 'Failed to request sign-in link'), response.status)
  }
  return unwrap<RequestMagicLinkResult>(result)
}

/**
 * Verify a magic-link token. On success the server sets httpOnly auth
 * cookies and the response indicates where the consumer app should
 * navigate next.
 *
 * @example
 * ```ts
 * const url = new URL(window.location.href)
 * const token = url.searchParams.get('token')!
 * const { redirectTo } = await verifyMagicLink({
 *   apiUrl: 'https://auth.example.com/api/auth',
 *   token,
 * })
 * window.location.assign(redirectTo)
 * ```
 */
export async function verifyMagicLink(
  opts: VerifyMagicLinkOptions
): Promise<VerifyMagicLinkResult> {
  const url = `${opts.apiUrl}/magic-link/verify?token=${encodeURIComponent(opts.token)}`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  const result = await response.json()
  if (!response.ok) {
    throw new AuthError(parseError(result, 'Failed to verify sign-in link'), response.status)
  }
  return unwrap<VerifyMagicLinkResult>(result)
}
