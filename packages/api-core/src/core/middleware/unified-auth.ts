/**
 * Unified authentication middleware factory — accepts EITHER a JWT cookie /
 * Bearer access token OR an API key (`X-API-Key` header / `Authorization:
 * ApiKey ...`). Required so server-to-server consumers can call the same
 * admin / CRUD endpoints that the dashboard uses with a session cookie.
 *
 * Strategy:
 *   1. Try the JWT verifier first (most common — dashboard sessions). If it
 *      attaches a user, the request is authenticated.
 *   2. If JWT auth is absent (no token) the API key verifier is invoked.
 *   3. Both verifiers are fully injected so the core stays agnostic — the
 *      consumer wires `verifyTokenMiddleware` + `validateApiKey` from its
 *      own implementations.
 *
 * Scope enforcement:
 *   - `requireKeyScope` constrains the API key path: `'admin'` rejects keys
 *     whose `scope` is anything other than `'admin'` with HTTP 403, `'user'`
 *     accepts `'admin' | 'user'`, `'readonly'` accepts all three. Legacy
 *     scope values (`'live'` / `'test'`) are mapped to `'user'` for this
 *     check so existing publishable keys can never reach an admin route.
 *   - JWT users are NOT scope-checked here — caller is expected to chain
 *     `requireAdmin` / `requireRole` from `./auth.js` AFTER this middleware
 *     when the route is admin-only.
 *
 * Multi-tenancy:
 *   - On API key success the verifier is responsible for attaching the key
 *     metadata to the request (e.g. `req.apiKey`) so downstream middleware
 *     (`attachDerivedScope`) can derive the audience from `req.user.appRoles`
 *     synthesised from the key's Application ownership.
 *
 * @module @ezstart/api-core/middleware/unified-auth
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { sendError } from '../responses.js'

/**
 * Scope levels accepted on the API key path. Mirrors the modern values from
 * the `ApiKey.scope` field. Legacy values `'live'` / `'test'` are demoted to
 * `'user'` for ranking purposes so a publishable key never satisfies
 * `'admin'`.
 */
export type UnifiedAuthScope = 'admin' | 'user' | 'readonly'

/**
 * Outcome of the JWT verification step.
 *
 * - `null` — no JWT was present (move on to API key fallback). The verifier
 *   MUST NOT call `res.send()` itself in this case.
 * - `{ ok: true }` — JWT was valid AND the verifier already populated
 *   `req.user` / `req.userId`. The middleware will short-circuit to
 *   `next()`.
 * - `{ ok: false }` — JWT was present but invalid (signature mismatch,
 *   expired, user not found, soft-deleted, ...). The verifier MAY have
 *   already responded; the middleware will NOT continue to the API key
 *   fallback to avoid masking a real auth failure with a "missing API key"
 *   error.
 */
export type UnifiedJwtResult = { ok: true } | { ok: false; responded: boolean } | null

/**
 * Outcome of the API key verification step.
 *
 * - `null` — no API key header was present, OR the key was invalid /
 *   expired / revoked. The verifier MAY have already responded with a 401
 *   / 429 envelope (e.g. quota exceeded). Pass `responded: true` so the
 *   middleware does not double-emit.
 * - `{ ok: true; scope }` — the verifier attached `req.user`, `req.apiKeyId`,
 *   etc. and returns the canonical scope (`admin` / `user` / `readonly`)
 *   for the policy check.
 */
export type UnifiedApiKeyResult =
  | { ok: true; scope: UnifiedAuthScope }
  | { ok: false; responded: boolean }
  | null

/**
 * Configuration accepted by `createUnifiedAuthMiddleware`.
 */
export type UnifiedAuthConfig = {
  /**
   * Verify the JWT (cookie or Bearer). MUST attach `req.user` / `req.userId`
   * itself when successful and MAY respond when the JWT is present but
   * invalid (e.g. expired). Return `null` ONLY when no JWT was present at
   * all so the API key fallback can run.
   */
  verifyJwt: (req: Request, res: Response) => Promise<UnifiedJwtResult>
  /**
   * Verify the API key (`X-API-Key` header or `Authorization: ApiKey ...`).
   * MUST attach `req.user` / `req.apiKey` etc. itself when successful.
   * Return `null` when no API key header was present.
   */
  verifyApiKey: (req: Request, res: Response) => Promise<UnifiedApiKeyResult>
  /**
   * Minimum scope required when authenticating via API key.
   *
   * - `'admin'` → only `scope === 'admin'` accepted (server-to-server
   *   admin operations: list/create/revoke keys, manage Applications).
   * - `'user'` → `'admin' | 'user'` accepted.
   * - `'readonly'` → all three accepted.
   *
   * Defaults to `'user'`.
   */
  requireKeyScope?: UnifiedAuthScope
}

const SCOPE_RANK: Record<UnifiedAuthScope, number> = {
  readonly: 0,
  user: 1,
  admin: 2,
}

function meetsScope(actual: UnifiedAuthScope, required: UnifiedAuthScope): boolean {
  return SCOPE_RANK[actual] >= SCOPE_RANK[required]
}

/**
 * Build a middleware that accepts BOTH a JWT cookie/Bearer AND an API key.
 *
 * Place exactly where you would have placed `verifyTokenMiddleware` (or the
 * SDK equivalent) — the produced middleware is drop-in compatible.
 *
 * @example
 * ```ts
 * import { createUnifiedAuthMiddleware } from '@ezstart/api-core'
 *
 * const authJwtOrKey = createUnifiedAuthMiddleware({
 *   verifyJwt: async (req, res) => myJwtMiddleware(req, res),
 *   verifyApiKey: async (req, res) => myApiKeyMiddleware(req, res),
 *   requireKeyScope: 'admin',
 * })
 *
 * router.get('/admin/resource', authJwtOrKey, controller)
 * ```
 */
export function createUnifiedAuthMiddleware(config: UnifiedAuthConfig): RequestHandler {
  const requiredScope = config.requireKeyScope ?? 'user'

  return (req: Request, res: Response, next: NextFunction): void => {
    void runUnifiedAuth(req, res, next, config, requiredScope)
  }
}

async function runUnifiedAuth(
  req: Request,
  res: Response,
  next: NextFunction,
  config: UnifiedAuthConfig,
  requiredScope: UnifiedAuthScope
): Promise<void> {
  // ---------- 1. JWT first (dashboard sessions) ----------
  let jwtResult: UnifiedJwtResult = null
  try {
    jwtResult = await config.verifyJwt(req, res)
  } catch {
    // Verifier crashed — be defensive and treat as a hard auth failure so we
    // do NOT silently fall back to the API key path (which could mask a
    // serious bug). The JWT verifier is expected to handle its own errors
    // via `sendError`.
    if (!res.headersSent) {
      sendError(res, 'Authentication failed', 500, { code: 'AUTH_INTERNAL_ERROR' })
    }
    return
  }

  if (jwtResult?.ok === true) {
    // JWT verifier already attached `req.user` — done.
    next()
    return
  }
  if (jwtResult?.ok === false) {
    // JWT was present but invalid → do NOT fall back to API key (would mask
    // expired / forged tokens behind a "missing API key" 401).
    if (!jwtResult.responded && !res.headersSent) {
      sendError(res, 'Invalid or expired token', 401, { code: 'INVALID_TOKEN' })
    }
    return
  }

  // ---------- 2. API key fallback ----------
  let keyResult: UnifiedApiKeyResult = null
  try {
    keyResult = await config.verifyApiKey(req, res)
  } catch {
    if (!res.headersSent) {
      sendError(res, 'Authentication failed', 500, { code: 'AUTH_INTERNAL_ERROR' })
    }
    return
  }

  if (keyResult?.ok === true) {
    if (!meetsScope(keyResult.scope, requiredScope)) {
      sendError(res, `Insufficient API key scope (required: ${requiredScope})`, 403, {
        code: 'INSUFFICIENT_SCOPE',
      })
      return
    }
    next()
    return
  }
  if (keyResult?.ok === false) {
    if (!keyResult.responded && !res.headersSent) {
      sendError(res, 'Invalid API key', 401, { code: 'INVALID_API_KEY' })
    }
    return
  }

  // No JWT, no API key.
  if (!res.headersSent) {
    sendError(res, 'Authentication required', 401, { code: 'UNAUTHORIZED' })
  }
}
