/**
 * `redactAuthUser` — defense-in-depth helper that strips known-sensitive
 * fields from any `AuthUser`-shaped object before it crosses a trust
 * boundary (HTTP response body, log line, audit trail, error message).
 *
 * Why this lives in its own file:
 *
 * `AuthUserSchema` (in `./auth-shared.ts`) uses `.passthrough()` to preserve
 * unknown forward-compat fields — required for non-breaking schema
 * evolution. The side effect is that a buggy server returning `password` /
 * `passwordHash` / `totpSecret` would leak those fields through the parsed
 * shape. The schema cannot enforce absence of unknown sensitive fields; it
 * can only preserve what's there. This helper is the canonical mitigation.
 *
 * @see ./auth-shared.ts (AuthUserSchema documents the same caveat)
 * @see A2 in `tmp/hacker-wave-a-lot1.md`
 */

/**
 * Keys that MUST be stripped from any `AuthUser`-shaped object before it
 * crosses a trust boundary (`/me` response, `/users/:id` response, logs,
 * audit trails).
 *
 * Add new sensitive keys here as the model evolves. Order doesn't matter,
 * {@link redactAuthUser} does a `delete` per key.
 *
 * **Lot 2.1.1 expansion (2026-05-15)** — the list was extended to align with
 * the actual field names used by ezauth's separate sensitive-data
 * collections (`refresh-token.ts`, `oauth-account.ts`, `totp-secret.ts`,
 * `application.ts`, `magic-link-request.ts`, `email-change-request.ts`).
 * Any server that does `.lean()` + `.populate()` across these collections
 * (e.g. joining `User` with its `OAuthAccount`s) and forwards the joined
 * object to {@link redactAuthUser} is now covered.
 *
 * **Caveat: `secret`, `accessToken`, `refreshToken` are generic key names.**
 * They are kept in the list because they match the ezauth Mongoose field
 * names (`TotpSecret.secret`, `OAuthAccount.accessToken`,
 * `OAuthAccount.refreshToken`). A consumer that uses one of these names
 * for a NON-sensitive field on a User-shaped object will see it stripped
 * unexpectedly. Rename non-sensitive fields to avoid collision (e.g.
 * `secretQuestion` is safe — exact-match strip, not substring).
 */
export const SENSITIVE_AUTH_USER_KEYS = [
  // Original 7 (Lot 1)
  'password',
  'passwordHash',
  'tempToken',
  'totpSecret',
  'recoveryCodes',
  'oauthRefreshToken',
  'apiKeySecret',
  // Lot 2.1.1 — canonical ezauth field names from separate collections
  'tokenHash', // refresh-token.ts
  'accessToken', // oauth-account.ts (encrypted at rest, but never emit)
  'refreshToken', // oauth-account.ts (encrypted at rest, but never emit)
  'secret', // totp-secret.ts (TOTP shared secret)
  'backupCodes', // totp-secret.ts (hashed 2FA backup codes)
  'webhookSecret', // application.ts (HMAC signing key)
  // Lot 2.1.1 — common semantic aliases (would catch hand-rolled fields)
  'magicLinkToken',
  'passwordResetToken',
  'emailVerificationToken',
  'oauthAccessToken',
  'oauthIdToken',
  'refreshTokenHash', // semantic alias for refresh-token.ts.tokenHash
  'twoFactorSecret',
  'twoFactorBackupCodes',
] as const

export type SensitiveAuthUserKey = (typeof SENSITIVE_AUTH_USER_KEYS)[number]

/**
 * Return a defensive shallow copy of `user` with sensitive fields stripped.
 *
 * **Use on the SERVER** before sending an auth-user-shaped object to any
 * untrusted boundary (response body, error message, log line, audit trail).
 * `AuthUserSchema.passthrough()` preserves unknown fields by design (for
 * forward-compat), so this helper is the canonical way to enforce the
 * "never emit secrets" contract documented on `AuthUserSchema`.
 *
 * The helper is pure (no side effects on `user`), shallow (does not recurse
 * into nested objects — call sites should not nest secrets), and zero-dep.
 *
 * Currently strips: `password`, `passwordHash`, `tempToken`, `totpSecret`,
 * `recoveryCodes`, `oauthRefreshToken`, `apiKeySecret`, plus (Lot 2.1.1)
 * `tokenHash`, `accessToken`, `refreshToken`, `secret`, `backupCodes`,
 * `webhookSecret`, `magicLinkToken`, `passwordResetToken`,
 * `emailVerificationToken`, `oauthAccessToken`, `oauthIdToken`,
 * `refreshTokenHash`, `twoFactorSecret`, `twoFactorBackupCodes`. See
 * {@link SENSITIVE_AUTH_USER_KEYS} for the canonical list and the
 * generic-key collision caveat.
 *
 * @example
 * ```ts
 * import { redactAuthUser } from '@ezstart/api-contracts'
 *
 * const user = await UserModel.findById(id).lean()
 * res.json({ success: true, data: redactAuthUser(user) })
 * ```
 *
 * @example
 * ```ts
 * // Logging path — strip before serializing to log sink
 * logger.info({ user: redactAuthUser(user), action: 'login' })
 * ```
 *
 * @see A2 in `tmp/hacker-wave-a-lot1.md`
 */
export function redactAuthUser<T extends Record<string, unknown>>(
  user: T
): Omit<T, SensitiveAuthUserKey> {
  const out = { ...user }
  for (const key of SENSITIVE_AUTH_USER_KEYS) {
    delete (out as Record<string, unknown>)[key]
  }
  return out as Omit<T, SensitiveAuthUserKey>
}
