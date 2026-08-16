'use client'

import { logger } from '../../internal-logger.js'
import { detectCurrentThemePreference } from '../../themePreference.js'
import { buildPostLoginRedirect } from '../../postLoginRedirect.js'

/** @internal */
export interface CompleteLoginRedirectOptions {
  resolvedRedirectUri: string
  code: string
  /**
   * PKCE (RFC 7636) `code_verifier` for the same-origin exchange. Only set by
   * the same-origin path (the verifier never crosses origins). Forwarded to
   * `handleCallback` so the bound code is accepted. Undefined ⇒ no-PKCE.
   */
  codeVerifier?: string
  /**
   * `useAuth().handleCallback` — exchanges the auth code for tokens.
   *
   * Receives `redirectUriOverride` so the token exchange can echo back the
   * SAME `redirect_uri` that was sent at code creation (RFC 6749 §4.1.3
   * strict equality). For same-origin first-party flows this is the
   * destination URL (e.g. `/dashboard`), NOT the SDK's `/auth/callback`
   * default.
   */
  handleCallback: (
    code: string,
    codeVerifier?: string,
    redirectUriOverride?: string
  ) => Promise<unknown>
  /** Fallback error message when the same-origin exchange throws a non-Error. */
  fallbackError: string
}

/**
 * Navigate the user to the post-login destination once a successful login has
 * yielded an authorization `code`.
 *
 * Distinguishes two flows:
 *
 * 1. **Same-origin first-party** (e.g. ezauth dogfood hitting `/admin` on its
 *    own origin) — there is no `/auth/callback` handler on the destination, so
 *    the SDK MUST exchange the code itself via `handleCallback` BEFORE
 *    navigating. Otherwise the destination page renders with no tokens in the
 *    store, `RequireAuth` flips to unauthenticated, and we redirect right back
 *    to `/login` — an infinite loop.
 *
 * 2. **Cross-origin SSO** (foreign consumer app) — append `?code=` so the
 *    consumer's `/auth/callback` can exchange it, plus `?theme=` so the
 *    consumer adopts the user's last-chosen scheme.
 *    `detectCurrentThemePreference` returns `undefined` when no signal is
 *    available — the param is omitted in that case.
 *
 * @internal
 */
export async function completeLoginRedirect({
  resolvedRedirectUri,
  code,
  codeVerifier,
  handleCallback,
  fallbackError,
}: CompleteLoginRedirectOptions): Promise<void> {
  logger.info('Redirecting to:', resolvedRedirectUri)
  const url = new URL(resolvedRedirectUri)
  const isSameOrigin = url.origin === window.location.origin

  if (isSameOrigin) {
    try {
      // Same-origin → exchange the code here, passing the PKCE verifier (if
      // the login committed to one) AND the resolved redirect URI (so the
      // /token exchange echoes back the exact value sent at /login — RFC 6749
      // §4.1.3 strict equality enforced backend-side as HAC-HIGH-4).
      await handleCallback(code, codeVerifier, resolvedRedirectUri)
    } catch (exchangeError) {
      logger.error(
        'Same-origin code exchange failed:',
        exchangeError instanceof Error ? exchangeError.message : String(exchangeError)
      )
      throw exchangeError instanceof Error ? exchangeError : new Error(fallbackError)
    }
    window.location.href = url.toString()
    return
  }

  // Cross-origin: forward the code (and theme) so the consumer's
  // `/auth/callback` can perform the exchange itself.
  const themePref = detectCurrentThemePreference()
  const target = buildPostLoginRedirect(
    resolvedRedirectUri,
    code,
    themePref,
    window.location.origin
  )
  window.location.href = target
}
