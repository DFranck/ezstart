/**
 * Core email-change client methods — agnostic, framework-free.
 *
 * Both methods are thin wrappers around `fetch` so the SDK can be consumed
 * in any JS environment (Node, Vue, Svelte, vanilla).
 *
 * Standard ref: `.claude/rules/standard-saas-security.md` §6 (token replay).
 */

import { cookieWrite } from './auth-client/cookie-write.js'
import { createCsrfHelper } from './auth-client/csrf.js'
import { AuthError } from './errors.js'

interface RequestEmailChangeOptions {
  /** Base API URL — must include `/api/auth` (same convention as `CoreAuthClient`). */
  apiUrl: string
  /** New email address requested. */
  newEmail: string
  /** Required when the user has set their own password. */
  password?: string
  /** Active locale for the verification email (en/fr/vi). */
  locale?: 'en' | 'fr' | 'vi' | string
  /** App slug for branding the email (e.g. 'green-pulse'). */
  app?: string
  /** Bearer token (optional — same-origin httpOnly cookie also works). */
  accessToken?: string
}

interface RequestEmailChangeResult {
  message: string
  expiresAt: string
}

interface VerifyEmailChangeOptions {
  apiUrl: string
  /** Token sent to the new email address (from `?token=` query). */
  token: string
}

interface VerifyEmailChangeResult {
  message: string
}

/**
 * Unwrap `{ data: T }` envelope or return the flat body.
 *
 * @internal
 */
function unwrap<T>(body: Record<string, unknown>): T {
  if ('data' in body && body.data !== undefined) {
    return body.data as T
  }
  return body as T
}

/**
 * Best-effort error message extraction matching the api-core envelope shape.
 *
 * @internal
 */
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
 * Request an email change. The verification link is sent to the NEW
 * email address (proof of control). Resolve the SDK locale and brand
 * context via the `locale` + `app` options.
 *
 * @example
 * ```ts
 * await requestEmailChange({
 *   apiUrl: 'https://auth.example.com/api/auth',
 *   newEmail: 'new@example.com',
 *   password: 'current-password',
 *   locale: 'fr',
 * })
 * ```
 */
export async function requestEmailChange(
  opts: RequestEmailChangeOptions
): Promise<RequestEmailChangeResult> {
  const body: Record<string, unknown> = { newEmail: opts.newEmail }
  if (opts.password !== undefined) body.password = opts.password
  if (opts.locale !== undefined) body.locale = opts.locale
  if (opts.app !== undefined) body.app = opts.app

  // Route through the centralized `cookieWrite` helper so the same-origin
  // cookie-auth path attaches the double-submit `X-CSRF-Token` header (priming
  // the cookie on cache miss + retrying once on a 403 mismatch). A raw `fetch`
  // with `credentials: 'include'` here would be CSRF-vulnerable — the browser
  // sends the httpOnly session cookie automatically but never the CSRF header.
  // The standalone function owns no API key, so `baseHeaders` just passes
  // extras through. Bearer callers keep working: `cookieWrite` still attaches
  // the (harmless, server-ignored) CSRF header alongside the Authorization one.
  const baseHeaders = (extra?: Record<string, string>): Record<string, string> => ({ ...extra })
  const csrf = createCsrfHelper({ apiUrl: opts.apiUrl, baseHeaders })

  const response = await cookieWrite({ apiUrl: opts.apiUrl, baseHeaders, csrf }, '/change-email', {
    method: 'POST',
    headers: opts.accessToken ? { Authorization: `Bearer ${opts.accessToken}` } : undefined,
    body: JSON.stringify(body),
  })

  const result = await response.json()
  if (!response.ok) {
    throw new AuthError(parseError(result, 'Failed to request email change'), response.status)
  }
  return unwrap<RequestEmailChangeResult>(result)
}

/**
 * Verify an email-change token (the token is in the link sent to the
 * new email address). On success the user's email is updated and all
 * refresh tokens are revoked — the user must sign back in with the new
 * email.
 *
 * @example
 * ```ts
 * const url = new URL(window.location.href)
 * const token = url.searchParams.get('token')!
 * await verifyEmailChange({
 *   apiUrl: 'https://auth.example.com/api/auth',
 *   token,
 * })
 * ```
 */
export async function verifyEmailChange(
  opts: VerifyEmailChangeOptions
): Promise<VerifyEmailChangeResult> {
  const url = `${opts.apiUrl}/email-change/verify?token=${encodeURIComponent(opts.token)}`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  const result = await response.json()
  if (!response.ok) {
    throw new AuthError(parseError(result, 'Failed to verify email change'), response.status)
  }
  return unwrap<VerifyEmailChangeResult>(result)
}
