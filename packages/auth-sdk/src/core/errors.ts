/**
 * Auth-specific error class.
 *
 * Carries an HTTP status code so consumers can distinguish 401 (re-auth)
 * from 403 (forbidden) from generic failures.
 */
export class AuthError extends Error {
  readonly status: number
  readonly code: string | undefined

  constructor(message: string, status: number = 0, code?: string) {
    super(message)
    this.name = 'AuthError'
    this.status = status
    this.code = code
  }

  /** Type guard. */
  static isAuthError(err: unknown): err is AuthError {
    return err instanceof AuthError
  }
}

/**
 * Machine-readable error code returned by the `requireEmailVerified` server
 * gate (HTTP 403) when an authenticated user attempts a privileged action
 * before verifying their email address.
 *
 * The value mirrors the constant exported from `@ezstart/auth-sdk/server`
 * (`EMAIL_VERIFICATION_REQUIRED_CODE`). It is duplicated here — a plain
 * string literal — so the agnostic client core never imports the
 * `server-only` module. Both MUST stay in sync; the round-trip test in
 * `__tests__/core/email-verification-error.test.ts` pins the value.
 *
 * @example
 * ```ts
 * try {
 *   await client.changePassword(current, next)
 * } catch (err) {
 *   if (isEmailVerificationRequiredError(err)) {
 *     // Surface the dedicated <EmailVerificationBanner> + resend CTA.
 *   }
 * }
 * ```
 */
export const EMAIL_VERIFICATION_REQUIRED = 'EMAIL_VERIFICATION_REQUIRED'

/**
 * `true` when `err` is an {@link AuthError} carrying the
 * {@link EMAIL_VERIFICATION_REQUIRED} code — i.e. the server rejected a
 * privileged action because the authenticated user has not yet verified
 * their email.
 *
 * Consumers switch on this to render a "verify your email" prompt (e.g. the
 * `<EmailVerificationBanner>` + a resend CTA) instead of a generic
 * "Something went wrong" message.
 *
 * @param err - The caught error (any value — narrows safely).
 * @returns `true` when `err` is an {@link AuthError} with
 *          `code === 'EMAIL_VERIFICATION_REQUIRED'`.
 *
 * @example
 * ```ts
 * try {
 *   await client.deleteAccount()
 * } catch (err) {
 *   if (isEmailVerificationRequiredError(err)) {
 *     showVerifyEmailPrompt()
 *     return
 *   }
 *   throw err
 * }
 * ```
 */
export function isEmailVerificationRequiredError(err: unknown): err is AuthError {
  return AuthError.isAuthError(err) && err.code === EMAIL_VERIFICATION_REQUIRED
}
