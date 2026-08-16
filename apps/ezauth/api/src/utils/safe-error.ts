/**
 * Safe error-message mapping for HTTP error responses.
 *
 * MED-1 / MED-3 (Wave D Lot 3.x) — route catch-blocks must NEVER echo a raw
 * `error.message` to the client. An unexpected error (Mongoose duplicate-key
 * `E11000 … collection: ezauth.auth_users index: …`, schema-validation hints,
 * cast errors, stack-derived strings, etc.) leaks internal structure — DB
 * names, index names, field names — that helps an attacker map the backend.
 *
 * The fix is an allowlist: only intentional, UX-relevant messages that the
 * service deliberately throws are surfaced verbatim. Everything else collapses
 * to a stable, generic fallback. The original error is still logged server-side
 * for diagnostics (the caller logs it before mapping).
 *
 * This is the shared, promoted version of the inline `SAFE_*_MESSAGES` +
 * `map*ErrorMessage` pattern that previously lived in `login.ts` / `token.ts`
 * (cf. `standard.md` §0 — "PROMOTE SI PATTERN RÉPÉTÉ").
 *
 * @example
 * ```ts
 * } catch (error) {
 *   logger.error('Login error:', error)
 *   sendError(res, toSafeErrorMessage(error, {
 *     allow: ['Invalid credentials', "You haven't set a password yet…"],
 *     fallback: 'Login failed',
 *   }), 401)
 * }
 * ```
 */

export interface SafeErrorOptions {
  /**
   * Intentional, client-safe messages thrown by the service layer. Anything
   * not in this set is replaced by {@link SafeErrorOptions.fallback}. Accepts
   * an array or a pre-built `Set` (a `Set` is preferred when the allowlist is
   * module-scoped and reused across requests).
   */
  allow: ReadonlySet<string> | readonly string[]
  /**
   * Generic message returned when the thrown message is NOT on the allowlist
   * (or the thrown value isn't an `Error`). Keep it stable and non-leaking.
   */
  fallback: string
}

/**
 * Map a thrown value to a client-safe message.
 *
 * Returns the original `error.message` ONLY when `error` is an `Error` whose
 * message is on the allowlist; otherwise returns the generic `fallback`.
 *
 * @param error - The caught value (typed `unknown`, as in a `catch` block).
 * @param options - Allowlist of intentional messages + the generic fallback.
 * @returns A message safe to send to the client.
 */
export function toSafeErrorMessage(error: unknown, options: SafeErrorOptions): string {
  const allowSet = options.allow instanceof Set ? options.allow : new Set(options.allow)
  if (error instanceof Error && allowSet.has(error.message)) {
    return error.message
  }
  return options.fallback
}
