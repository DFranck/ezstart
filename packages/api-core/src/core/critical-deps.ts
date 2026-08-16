/**
 * Critical environment-variable contract for an API.
 *
 * Each app declares the env vars its `/health/deep` probe MUST cover.
 * When one is missing, the deep-health check that would normally surface
 * its dependency is silently skipped (cf. hacker-A8 V3 — false-positive
 * uptime: status page shows "operational" while transactional email is
 * actually broken).
 *
 * `assertCriticalDeps` is the boot-time gate that closes that hole:
 *
 * - `NODE_ENV === 'production'` and missing → THROW (fail-fast).
 * - dev / staging and missing → `logger.warn` once, boot continues.
 *
 * See `.claude/rules/standard-saas-observability.md` §4.
 *
 * @example
 * ```ts
 * import { assertCriticalDeps } from '@ezstart/api-core'
 * import { logger } from '@ezstart/logger/server'
 *
 * assertCriticalDeps({
 *   app: 'ezauth',
 *   required: ['MONGO_URL', 'JWT_SECRET', 'RESEND_API_KEY'],
 *   logger,
 * })
 * ```
 */

/**
 * Minimal logger surface — same shape exposed by `@ezstart/logger/server`
 * so the helper stays publishable without monorepo coupling.
 */
export type CriticalDepsLogger = {
  warn: (msg: string, meta?: Record<string, unknown>) => void
  error?: (msg: string, meta?: Record<string, unknown>) => void
}

/** Options accepted by {@link assertCriticalDeps}. */
export type AssertCriticalDepsOptions = {
  /** Slug of the app boot-checking its env (used in log messages). */
  app: string
  /** Names of `process.env` keys that MUST be present at boot. */
  required: readonly string[]
  /** Logger used for the non-prod warn branch. */
  logger: CriticalDepsLogger
  /**
   * Override the env. Defaults to `process.env`. Exposed for tests so
   * a missing var can be simulated without mutating the real env.
   */
  env?: NodeJS.ProcessEnv
  /**
   * Override the production detection. Defaults to
   * `process.env.NODE_ENV === 'production'`. Useful in tests to exercise
   * both branches without setting `NODE_ENV`.
   */
  isProd?: boolean
}

/**
 * Return the subset of `required` env keys that are missing (empty string
 * counts as missing — that's how Railway / Vercel surface an unset var
 * via the CLI). Whitespace-only values are also treated as missing
 * (hacker-A8.5 V9 — a copy-paste env var like `MONGO_URL='   '` would
 * otherwise pass `findMissingDeps` only to blow up later at connect time).
 *
 * Exposed for tests + ad-hoc callers that want the diagnostic without
 * the throw / warn side effect.
 */
export function findMissingDeps(
  required: readonly string[],
  env: NodeJS.ProcessEnv = process.env
): string[] {
  return required.filter(key => {
    const value = env[key]
    return value === undefined || value.trim() === ''
  })
}

/**
 * Enforce the critical-deps contract at boot. Throws in production when
 * any required env var is missing, otherwise logs a warning so the
 * operator sees the gap before traffic starts hitting the API.
 *
 * Idempotent — safe to call once at the top of `index.ts` before any
 * dependency-gated check is registered.
 */
export function assertCriticalDeps(options: AssertCriticalDepsOptions): void {
  const env = options.env ?? process.env
  const isProd = options.isProd ?? env.NODE_ENV === 'production'
  const missing = findMissingDeps(options.required, env)

  if (missing.length === 0) return

  const summary = missing.join(', ')

  if (isProd) {
    const message =
      `[critical-deps] ${options.app}: missing required env var(s) [${summary}]. ` +
      `Refusing to boot in production — set these in the deploy environment ` +
      `(Railway/Vercel) before re-deploying. See ` +
      `.claude/rules/standard-saas-observability.md §4.`
    options.logger.error?.(message, { app: options.app, missing })
    throw new Error(message)
  }

  options.logger.warn(
    `[critical-deps] ${options.app}: missing env var(s) [${summary}] — ` +
      `the matching /health/deep dependency check(s) will be skipped, which ` +
      `creates a false-positive uptime risk in production. Set them in the ` +
      `corresponding .env file before deploying.`,
    { app: options.app, missing }
  )
}
