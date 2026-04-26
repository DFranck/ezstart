/**
 * Build the post-login redirect URL.
 *
 * Two distinct flows must be supported:
 *
 * 1. **Cross-origin SSO code flow** (foreign consumer app)
 *
 *    The user signs in on `https://ezauth.example.com` to access
 *    `https://consumer.example.com`. The consumer's `/auth/callback`
 *    page exchanges the `?code=` for a session — so we MUST append the
 *    code (and the active theme preference) to the redirect URL.
 *
 * 2. **Same-origin first-party redirect** (ezauth dogfood / first-party app)
 *
 *    The user signs in on `https://ezauth.example.com` to access
 *    `https://ezauth.example.com/admin`. There is no callback handler at
 *    `/admin` — the cookie/token has already been set by the `/auth/login`
 *    API response, so the destination page will see `isAuthenticated=true`
 *    on its next render. Appending `?code=` would create a redirect loop:
 *    `RequireAuth` would not detect the just-set token in time, redirect
 *    back to `/login?redirect_uri=...&code=...`, and the cycle repeats.
 *
 *    The fix is to drop the `?code=` and `?theme=` query params for
 *    same-origin redirects.
 *
 * The function returns the final URL string ready to assign to
 * `window.location.href`.
 *
 * @param redirectUri  The raw redirect URL provided by the consumer.
 * @param code         The OAuth authorization code from the login response.
 * @param themePref    Optional theme preference to forward (cross-origin only).
 * @param currentOrigin The active `window.location.origin` (or equivalent).
 *                      Passed in so the helper stays pure and unit-testable.
 *
 * @example
 *   // Cross-origin → SSO code flow
 *   buildPostLoginRedirect(
 *     'https://consumer.example.com/auth/callback',
 *     'auth-code-123',
 *     'dark',
 *     'https://ezauth.example.com'
 *   )
 *   // → 'https://consumer.example.com/auth/callback?code=auth-code-123&theme=dark'
 *
 * @example
 *   // Same-origin → direct redirect (no code, no theme)
 *   buildPostLoginRedirect(
 *     'https://ezauth.example.com/en/admin',
 *     'auth-code-123',
 *     'dark',
 *     'https://ezauth.example.com'
 *   )
 *   // → 'https://ezauth.example.com/en/admin'
 */
export function buildPostLoginRedirect(
  redirectUri: string,
  code: string,
  themePref: string | undefined,
  currentOrigin: string
): string {
  const url = new URL(redirectUri)

  // Same-origin: this is a first-party landing page (e.g. ezauth dogfood
  // hitting its own /admin), NOT a foreign consumer's /auth/callback.
  // The cookie is already set, so navigate directly without the SSO dance.
  if (url.origin === currentOrigin) {
    return url.toString()
  }

  // Cross-origin: append the authorization code so the consumer's callback
  // can exchange it, plus the active theme preference so the consumer can
  // adopt the user's last-chosen scheme.
  url.searchParams.set('code', code)
  if (themePref) {
    url.searchParams.set('theme', themePref)
  }
  return url.toString()
}
