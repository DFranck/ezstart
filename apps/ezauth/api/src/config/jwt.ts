/**
 * JWT issuer / audience constants used when signing and verifying access
 * tokens for the EZAuth API.
 *
 * Why these claims matter
 * -----------------------
 * `JWT_SECRET` is shared across every @ezstart API (ezauth, ezpay, ezbill,
 * green-pulse) because they all trust the same identity provider (ezauth).
 * Without explicit `iss` / `aud` claims, a token signed for **one** of those
 * APIs is bit-for-bit valid when replayed against **another**: ezpay's
 * middleware would happily decode an ezauth-issued token and grant the user
 * access to payment endpoints they were never authorised for.
 *
 * The fix (HAC-CRIT-2 — Wave D Lot 1B) is to:
 *
 * 1. Stamp every ezauth-issued JWT with `iss: 'ezauth'` and an explicit
 *    `aud` matching the *target* API (`'ezauth'` for self-issued sessions,
 *    `'ezpay'` / `'ezbill'` / etc. for cross-API tokens).
 * 2. Have every API enforce its own audience strictly on verify — a token
 *    minted for ezauth is rejected by ezpay with `audience invalid`.
 *
 * `jsonwebtoken` enforces `iss` + `aud` via {@link jwt.VerifyOptions}; any
 * mismatch throws `JsonWebTokenError` which the middleware maps to 401.
 *
 * RFC 7519 §4.1.1 (iss) and §4.1.3 (aud).
 *
 * Backward-compat note
 * --------------------
 * Tokens issued **before** this fix have no `iss` / `aud` claim and will be
 * rejected after deploy. Access tokens expire in 15 min (see
 * `ACCESS_TOKEN_EXPIRES_IN`) so the natural blast radius is one quarter-hour
 * of forced re-login. Refresh tokens are rotated on use, so the first
 * `/refresh` call after deploy mints a fresh, claim-stamped pair.
 */

/**
 * The single canonical issuer for every @ezstart JWT. Stamped on every
 * `jwt.sign` call below and enforced on every `jwt.verify` call across all
 * consumer APIs (`createApiAuth({ issuer: JWT_ISSUER, audience: '<app>' })`).
 *
 * Kept as a string literal type so it cannot drift between sign/verify
 * sites by accident.
 */
export const JWT_ISSUER = 'ezauth' as const

/**
 * The audience this API enforces on verify — i.e. the slug ezauth claims as
 * its own. A token presented to the ezauth API MUST list `'ezauth'` in its
 * `aud` claim.
 *
 * Symmetrical with `createApiAuth({ audience: 'ezpay' })` in ezpay,
 * `audience: 'ezbill'` in ezbill, etc.
 */
export const JWT_VERIFIER_AUDIENCE = 'ezauth' as const

/**
 * The full audience list every ezauth-issued access token carries. A token
 * minted by ezauth is intended to be presentable at any of the @ezstart
 * platform APIs (the user keeps a single session across the SaaS suite),
 * so every API slug appears here.
 *
 * **Why a list, not a single value?**
 *
 * RFC 7519 §4.1.3 permits `aud` to be either a string or an array. When the
 * verifier passes a single string ({@link verifierAudience}), `jsonwebtoken`
 * accepts the token iff that string appears in the token's `aud` array. So
 * ezpay (verifier audience `'ezpay'`) accepts any token whose `aud` array
 * contains `'ezpay'`, and rejects an attacker-forged token whose `aud` is
 * `['evil-app']` because `'ezpay'` is missing.
 *
 * Cross-API escalation is blocked because the verifier identity is the
 * audience the attacker cannot mint (without `JWT_SECRET`). Even if every
 * @ezstart API trusts the same shared secret, the audience claim acts as a
 * **second factor** that ties the token to the platform's known consumer
 * surface.
 *
 * Adding a new consumer = one line here + verifier-side `audience: '<slug>'`
 * in the new app's `createApiAuth({ audience: '<slug>' })` call.
 */
export const JWT_AUDIENCE_LIST = ['ezauth', 'ezpay', 'ezbill', 'green-pulse'] as const

/**
 * Default audience array used when signing tokens. Currently the full list
 * so any @ezstart API can consume a token; in the future a per-Application
 * scoping could narrow this down (e.g. an OAuth-issued token bound to a
 * single Application would carry only that slug).
 *
 * Returned as a fresh, mutable array each call — `jsonwebtoken`'s
 * {@link jwt.SignOptions} typing expects a mutable `string[]` for the
 * `audience` field.
 */
export function defaultSignAudience(): string[] {
  return [...JWT_AUDIENCE_LIST]
}
