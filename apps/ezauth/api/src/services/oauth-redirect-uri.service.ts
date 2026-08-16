/**
 * OAuth `redirect_uri` validation (RFC 6749 §3.1.2 + §4.1.3).
 *
 * Closes HAC-HIGH-3 and HAC-HIGH-4 (Wave D Lot 2C).
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
 */

import { logger } from '@ezstart/logger/server'
import { getApplicationModel } from '../models/application.js'

/**
 * Subset of the Application document used by `validateRedirectUri`. Keeping
 * the input shape narrow lets callers pass either a real Mongoose document
 * or a plain `.lean()` projection without dragging the full model surface
 * into the helper signature.
 */
export interface ApplicationRedirectUrisLike {
  redirectUris?: string[]
}

/**
 * RFC 6749 §3.1.2 exact-match validation of `redirect_uri` against the
 * Application's registered URI allowlist.
 *
 * The match is **exact** (`===` after the array containment check) — no
 * case folding, no trailing-slash normalization, no querystring stripping.
 * Any normalization would open well-known bypass classes
 * (IDN / homoglyph / `//` userinfo / unicode case folding), so the policy
 * here forces every callback URL to be registered verbatim by the tenant.
 *
 * Fails closed on:
 * - `null` / `undefined` / non-string input
 * - An Application whose `redirectUris` array is empty (OAuth disabled)
 * - Any URI that is not literally in the allowlist
 *
 * @param application - Subset of the Application document carrying the
 *   registered redirect URIs. `undefined` / missing field → fail closed.
 * @param redirectUri - The `redirect_uri` parameter supplied by the OAuth
 *   client. Must be a non-empty string to pass.
 * @returns `true` iff the URI is registered for this Application.
 *
 * @example
 * const app = await (await getApplicationModel()).findOne({ slug }).lean()
 * if (!validateRedirectUri(app, req.query.redirect_uri)) {
 *   return res.status(400).json({ error: 'invalid_redirect_uri' })
 * }
 */
export function validateRedirectUri(
  application: ApplicationRedirectUrisLike | null | undefined,
  redirectUri: string | null | undefined
): boolean {
  if (!application) return false
  if (typeof redirectUri !== 'string' || redirectUri.length === 0) return false
  const registered = application.redirectUris ?? []
  if (registered.length === 0) return false
  // Exact-match — see JSDoc above for why normalization is forbidden.
  return registered.includes(redirectUri)
}

/**
 * Convenience wrapper that resolves the Application by its slug (the same
 * value the OAuth flow carries as the `app` query parameter) and then
 * delegates to {@link validateRedirectUri}.
 *
 * Returns `false` for any of:
 * - Unknown slug
 * - Application archived (the model's pre-find archive guard hides it)
 * - `redirectUri` not in the registered allowlist
 *
 * Logs a structured warn on rejection so security audits can trace the
 * offending tenant + URI without paging through raw stdout.
 *
 * @internal exported for the OAuth route layer; callers outside this layer
 *   should prefer the lower-level {@link validateRedirectUri} after looking
 *   the Application up themselves (avoids a duplicate DB round trip).
 */
export async function validateRedirectUriForApp(
  appSlug: string,
  redirectUri: string | null | undefined
): Promise<boolean> {
  if (!appSlug || appSlug.length === 0) return false
  const Application = await getApplicationModel()
  const application = await Application.findOne({ slug: appSlug })
    .select('redirectUris')
    .lean<ApplicationRedirectUrisLike | null>()
  const ok = validateRedirectUri(application, redirectUri)
  if (!ok) {
    logger.warn(
      { appSlug, redirectUri, hasApplication: Boolean(application) },
      '[OAuth] redirect_uri rejected — not in Application.redirectUris allowlist'
    )
  }
  return ok
}
