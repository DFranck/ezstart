/**
 * Test/live mode derivation middleware (Stripe pattern).
 *
 * Inspects the incoming API key prefix and stamps `req.derivedMode` with
 * either `'test'` or `'live'`. The mode is then propagated through async code
 * via `withRequestContextMiddleware` (see `context/request-context.ts`) and
 * consumed by the per-app Mongoose `testModeScopePlugin` to auto-filter every
 * `find*`/`countDocuments` query by `{ isTestMode }`.
 *
 * ## Resolution order
 *
 * 1. **API key on the request** — `req.apiKey?.env` if your auth middleware
 *    populated it (preferred, zero re-parsing).
 * 2. **Inline detection from `X-API-Key` / `Authorization: ApiKey <key>`** —
 *    fallback for routes that didn't go through the API-key middleware
 *    (defensive: the prefix alone tells us the env even if the key is invalid
 *    — invalid keys are rejected by the auth middleware before any DB write).
 * 3. **Superadmin override** — `?mode=test|live` query param, ONLY honoured
 *    when the calling user has `globalRoles: ['superadmin']`. Useful for
 *    dashboard "view as test mode" toggles.
 * 4. **Default** — `'live'`. Cookie-auth dashboard requests with no key and
 *    no superadmin override stay on `'live'`.
 *
 * ## Placement
 *
 * MUST run AFTER the auth middleware that populates `req.user` and any
 * API-key middleware that populates `req.apiKeyId` / `req.apiKey`. SHOULD run
 * BEFORE `withRequestContextMiddleware` so the AsyncLocalStorage frame can
 * pick up the resolved mode.
 *
 * @example
 * import { attachDerivedMode, withRequestContextMiddleware } from '@ezstart/api-core'
 *
 * app.use(verifyTokenMiddleware) // sets req.user
 * app.use(validateApiKey)         // sets req.apiKeyId / req.apiKey (when applicable)
 * app.use(attachDerivedMode)      // sets req.derivedMode
 * app.use(withRequestContextMiddleware) // propagates ctx to async hooks
 *
 * @module @ezstart/api-core/middleware/derive-mode
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'
import {
  withRequestContext,
  type DerivedMode,
  type RequestContext,
} from '../context/request-context.js'

/** Re-export for convenience. */
export type { DerivedMode } from '../context/request-context.js'

const VALID_MODES: ReadonlySet<string> = new Set(['test', 'live'])

/**
 * Test/live key prefix patterns. Mirrors the registry in
 * `@ezstart/auth-sdk/core` (`detectKeyFormat`) but kept inline so this
 * middleware has zero runtime dep on the auth-sdk package.
 *
 * Legacy `ezk_*` keys (pre-2026) are intentionally NOT recognised here — they
 * predate the test/live split and should be rotated. They fall back to
 * `'live'` via the default branch, which matches their historical behaviour.
 */
function detectModeFromKey(rawKey: string): DerivedMode | undefined {
  if (rawKey.startsWith('ez_pk_test_') || rawKey.startsWith('ez_sk_test_')) return 'test'
  if (rawKey.startsWith('ez_pk_live_') || rawKey.startsWith('ez_sk_live_')) return 'live'
  return undefined
}

/** Pull the raw API key from headers (X-API-Key or `Authorization: ApiKey`). */
function extractRawApiKey(req: Request): string | undefined {
  const xApiKey = req.headers['x-api-key']
  if (typeof xApiKey === 'string' && xApiKey.length > 0) return xApiKey

  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('ApiKey ')) {
    return authHeader.substring(7)
  }
  return undefined
}

/** True iff the user carries the platform-wide superadmin role. */
function isSuperadmin(user: Request['user'] | undefined): boolean {
  return user?.globalRoles?.includes('superadmin') === true
}

/**
 * Resolve the effective mode for `req`. Pure function — exported for tests.
 *
 * @internal
 */
export function resolveDerivedMode(req: Request): DerivedMode {
  // 1. Trust an upstream auth middleware that already parsed the key and
  //    attached an `env` discriminator on the request (preferred path —
  //    EZAuth uses `req.apiKeyEnv`, EZPay uses `req.apiKey?.env`).
  const fromAuth = readEnvFromAuthMiddleware(req)
  if (fromAuth) return applySuperadminOverride(req, fromAuth)

  // 2. Inline detection from the raw key on the request headers.
  const rawKey = extractRawApiKey(req)
  if (rawKey) {
    const fromHeader = detectModeFromKey(rawKey)
    if (fromHeader) return applySuperadminOverride(req, fromHeader)
  }

  // 3. Cookie-auth or unauthenticated request — default to live, allow
  //    superadmin override via `?mode=` so the dashboard can toggle.
  return applySuperadminOverride(req, 'live')
}

/**
 * Read the env discriminator from any of the per-app conventions:
 *
 * - `req.apiKeyEnv` (EZAuth pattern, populated alongside `req.apiKeyId`)
 * - `req.apiKey?.env` (EZPay pattern, attaches a small object)
 *
 * Both are typed via `declare global` augmentations in their respective apps;
 * we only do best-effort runtime lookups here to keep this module agnostic.
 */
function readEnvFromAuthMiddleware(req: Request): DerivedMode | undefined {
  const reqWithKey = req as Request & {
    apiKeyEnv?: string
    apiKey?: { env?: string }
  }
  const candidates = [reqWithKey.apiKeyEnv, reqWithKey.apiKey?.env]
  for (const candidate of candidates) {
    if (candidate === 'test' || candidate === 'live') return candidate
  }
  return undefined
}

/**
 * Honour `?mode=test|live` ONLY when the caller is superadmin. Non-superadmin
 * overrides are silently ignored — preventing privilege escalation via the
 * query string (a `ez_pk_test_*` key holder cannot bump themselves to live
 * by tacking `?mode=live` onto a request).
 */
function applySuperadminOverride(req: Request, base: DerivedMode): DerivedMode {
  if (!isSuperadmin(req.user)) return base
  const raw = req.query?.mode
  if (typeof raw === 'string' && VALID_MODES.has(raw)) return raw as DerivedMode
  return base
}

/**
 * Express middleware that derives `req.derivedMode` from the request's API
 * key prefix (or superadmin override). Always sets a value — defaults to
 * `'live'` when no signal is present.
 */
export const attachDerivedMode: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  req.derivedMode = resolveDerivedMode(req)
  next()
}

/**
 * Express middleware that wraps the rest of the request lifecycle in an
 * `AsyncLocalStorage` frame populated with `derivedMode` and `userId`.
 * MUST be placed AFTER {@link attachDerivedMode}.
 *
 * The frame survives `await` boundaries so deep callers (Mongoose pre-find
 * hooks in particular) can read `getRequestContext()` without an explicit
 * `req` reference.
 */
export const withRequestContextMiddleware: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const ctx: RequestContext = {
    derivedMode: req.derivedMode,
    userId: req.userId,
  }
  withRequestContext(ctx, () => {
    next()
  })
}
