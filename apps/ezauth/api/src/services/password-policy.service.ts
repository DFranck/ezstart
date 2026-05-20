/**
 * Server-side password strength enforcement (MED-1 / Wave D Lot 3A).
 *
 * Implements the two checks mandated by `standard-saas-security.md` §2
 * ("Password strength enforcement — zxcvbn score >= 3, min 12 chars, pas
 * dans HaveIBeenPwned"):
 *
 *   1. zxcvbn entropy score — BLOCKING. Local, no network. Rejects passwords
 *      that are guessable (common words, keyboard walks, dates, or anything
 *      derived from the user's own identity via `userInputs`).
 *   2. HaveIBeenPwned "Pwned Passwords" range API via k-anonymity — FAIL-OPEN.
 *      Only the first 5 hex chars of the SHA-1 are ever sent over the wire,
 *      so the plaintext password never leaves this process. A network/5xx
 *      hiccup MUST NOT block account creation, so HIBP failures degrade to a
 *      logged warning instead of a thrown error.
 *
 * The `min(12).max(128)` length floor is enforced upstream by the Zod
 * schemas (`registerRequestSchema`, `changePasswordSchema`,
 * `ResetPasswordRequestSchema`) — this service assumes the length gate has
 * already passed and focuses on entropy + breach status.
 *
 * Network calls go through `fetchExternal()` from `@ezstart/api-sdk/core`
 * (never raw `fetch`) per the SSRF rule in `standard-saas-security.md` §4.
 * The `/core` entry point is imported (not the root) so this server-side
 * service never pulls the root's static React Query re-exports — that would
 * risk `ERR_MODULE_NOT_FOUND` on a `--frozen-lockfile` Railway install that
 * omits the React peer deps.
 */

import crypto from 'crypto'
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core'
import { dictionary, adjacencyGraphs } from '@zxcvbn-ts/language-common'
import { fetchExternal } from '@ezstart/api-sdk/core'
import { logger } from '@ezstart/logger/server'

// Configure zxcvbn once at module load. We only wire the language-common
// dictionary + adjacency graphs (keyboard layouts, l33t substitutions) — the
// English/French wordlists from `@zxcvbn-ts/language-en` are heavier and add
// little for our threat model (we already block identity-derived passwords via
// `userInputs`). Common is enough to flag the high-value low-entropy cases.
zxcvbnOptions.setOptions({
  dictionary: { ...dictionary },
  graphs: adjacencyGraphs,
})

/** Minimum acceptable zxcvbn score (0-4 scale). 3 = "safely unguessable". */
export const MIN_PASSWORD_SCORE = 3 as const

/**
 * MED-2 (Wave D Lot 3.5A) — cap the length of the string zxcvbn scores.
 *
 * zxcvbn is fully synchronous and its matcher graph is roughly quadratic in
 * input length: a 128-char password can burn ~250ms of event-loop CPU. The
 * upstream Zod `max(128)` caps the worst case, but `250ms × N` concurrent
 * signups is enough to starve the event loop. A 64-char prefix already carries
 * far more entropy than the score-3 threshold needs, so truncating the SCORED
 * string never changes the verdict for any realistic password while bounding
 * the CPU cost.
 *
 * IMPORTANT: only the zxcvbn input is truncated. The length floor (`min(12)`)
 * is checked against the REAL password length upstream (Zod), and the HIBP
 * breach check hashes the COMPLETE password (truncating would change the hash
 * and miss real breach hits).
 */
const ZXCVBN_SCORE_MAX_LENGTH = 64 as const

/** HaveIBeenPwned Pwned Passwords range endpoint (k-anonymity model). */
const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range'

/** Network timeout for the HIBP call — fail-open beyond this. */
const HIBP_TIMEOUT_MS = 2_500

/**
 * Thrown when a password is too weak (zxcvbn score below
 * {@link MIN_PASSWORD_SCORE}). Routes map this to HTTP 422 with a stable,
 * non-leaking `code`. The message is intentionally actionable but generic
 * (no internal detail).
 */
export class WeakPasswordError extends Error {
  readonly code = 'WEAK_PASSWORD' as const
  readonly statusCode = 422 as const

  constructor(message = 'Password is too weak — avoid common words and add length/variety') {
    super(message)
    this.name = 'WeakPasswordError'
  }
}

/**
 * Thrown when a password is found in the HaveIBeenPwned breach corpus.
 * Routes map this to HTTP 422 with a stable `code`.
 */
export class PwnedPasswordError extends Error {
  readonly code = 'PWNED_PASSWORD' as const
  readonly statusCode = 422 as const

  constructor(message = 'This password has appeared in a data breach — choose a different one') {
    super(message)
    this.name = 'PwnedPasswordError'
  }
}

/**
 * Query the HaveIBeenPwned Pwned Passwords range API using k-anonymity.
 *
 * Sends ONLY the first 5 chars of the uppercase SHA-1 hash; the API returns
 * every breached suffix sharing that prefix along with a sighting count. We
 * match the remaining 35 chars locally — the plaintext password and its full
 * hash never leave this process.
 *
 * @returns `true` if the password appears in the breach corpus, `false`
 *          otherwise. Throws on network/parse error so the caller can decide
 *          its degradation policy (callers here fail-open).
 *
 * @see https://haveibeenpwned.com/API/v3#PwnedPasswords
 */
export async function checkPwnedPassword(password: string): Promise<boolean> {
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)

  // AbortController so a hung connection fails-open within HIBP_TIMEOUT_MS
  // instead of stalling the whole signup request.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS)
  try {
    // `fetchExternal` returns the raw text body when the response isn't JSON
    // (the range API replies with newline-delimited `SUFFIX:COUNT` text).
    const body = await fetchExternal<string>(`${HIBP_RANGE_URL}/${prefix}`, {
      method: 'GET',
      headers: {
        // Padding hides the exact result-set size from a network observer.
        'Add-Padding': 'true',
      },
      signal: controller.signal,
    })
    if (typeof body !== 'string') return false
    for (const line of body.split('\n')) {
      const lineSuffix = line.split(':')[0]?.trim().toUpperCase()
      if (lineSuffix === suffix) return true
    }
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Enforce password strength server-side. Call this BEFORE hashing/saving any
 * new password (register, reset-password, change-password).
 *
 * - zxcvbn (BLOCKING): throws {@link WeakPasswordError} when score < 3.
 * - HIBP (FAIL-OPEN): throws {@link PwnedPasswordError} when the password is
 *   breached; a network failure is logged and ignored (account creation
 *   proceeds — availability over the breach check, which is defense-in-depth).
 *
 * The HIBP network call is skipped under `NODE_ENV === 'test'` so the unit
 * test suite never reaches the live API (dedicated tests exercise
 * {@link checkPwnedPassword} with a mocked `fetchExternal`). zxcvbn always
 * runs — it is local and deterministic.
 *
 * @param password - The candidate plaintext password (post length-gate).
 * @param userInputs - Tokens to penalize (e.g. `[email, username]`) so a
 *                     password derived from the user's identity scores low.
 */
export async function assertPasswordStrength(
  password: string,
  userInputs: string[] = []
): Promise<void> {
  // 1. Entropy — local, always blocking.
  const sanitizedInputs = userInputs.filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  )
  // MED-2 — score a length-capped prefix so a pathologically long password
  // can't pin the event loop (zxcvbn cost is ~quadratic in length). A 64-char
  // prefix is already well past the score-3 entropy threshold, so the verdict
  // is unchanged for realistic inputs. The length floor + HIBP run on the FULL
  // password elsewhere — see ZXCVBN_SCORE_MAX_LENGTH.
  const scoredPassword =
    password.length > ZXCVBN_SCORE_MAX_LENGTH
      ? password.slice(0, ZXCVBN_SCORE_MAX_LENGTH)
      : password
  const result = zxcvbn(scoredPassword, sanitizedInputs)
  if (result.score < MIN_PASSWORD_SCORE) {
    throw new WeakPasswordError()
  }

  // 2. Breach status — fail-open. Skipped in the test env (mocked separately).
  if (process.env.NODE_ENV === 'test') {
    return
  }
  try {
    const pwned = await checkPwnedPassword(password)
    if (pwned) {
      throw new PwnedPasswordError()
    }
  } catch (error: unknown) {
    // A genuine breach hit must still block — only swallow network/parse
    // errors (fail-open). `PwnedPasswordError` is intentional and rethrown.
    if (error instanceof PwnedPasswordError) {
      throw error
    }
    logger.warn(
      { err: error },
      '[password-policy] HIBP check failed — failing open (allowing password)'
    )
  }
}
