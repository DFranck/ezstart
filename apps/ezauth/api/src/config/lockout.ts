/**
 * Account-level brute force lockout configuration.
 *
 * IP-based rate limiting (`createStrictRateLimiter`) caps the number of login
 * attempts per minute from a single IP, but an attacker rotating IPs can keep
 * trying against the same account. These constants drive the account-level
 * counter that complements the IP limiter:
 *
 * - After {@link MAX_FAILED_LOGIN_ATTEMPTS} consecutive failed attempts on the
 *   same account (within {@link SLIDING_WINDOW_MS}), the account is locked for
 *   {@link LOCKOUT_DURATION_MS}. Subsequent attempts return 423 Locked until
 *   the lock expires.
 * - A successful login resets the counter and clears the lock.
 * - An attempt older than {@link SLIDING_WINDOW_MS} resets the counter to 1
 *   (sliding window) — historical failures don't count forever.
 *
 * Pattern aligned with Stripe / Auth0 / Clerk default lockout policies.
 * cf. `.claude/rules/standard-saas-security.md` §2 (Authentication — brute
 * force protection).
 */

/** Number of consecutive failed attempts before the account locks. */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5

/** Lockout duration once {@link MAX_FAILED_LOGIN_ATTEMPTS} is reached. */
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

/**
 * Sliding window for the failed-attempts counter. If the previous failed
 * attempt is older than this window, the new failure resets the counter to 1
 * (instead of incrementing the stale total).
 */
export const SLIDING_WINDOW_MS = 60 * 60 * 1000 // 1 hour

/**
 * 2FA-specific brute force lockout — applies to `/auth/2fa/validate`.
 *
 * Login lockout (above) protects the password, but a TOTP code is only
 * 10⁶ combinations. Without a per-account counter on the 2FA challenge an
 * attacker who already has the password can keep guessing codes — the IP
 * rate-limit alone is too coarse (an attacker rotating IPs would clear it).
 *
 * Same algorithm + sliding window as the login counter, scoped to the
 * `failedTwoFactorAttempts` / `twoFactorLockedUntil` / `lastFailedTwoFactorAt`
 * fields on the user. Constants are separate so the two policies can be
 * tuned independently if needed.
 */
export const MAX_FAILED_TWO_FACTOR_ATTEMPTS = 5

export const TWO_FACTOR_LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
