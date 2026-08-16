/**
 * EZPay unified auth — accepts EITHER a Bearer JWT (cookie/header) OR an
 * EZPay API key (`X-API-Key` / `Authorization: ApiKey <key>`). Symmetrical
 * with `apps/ezauth/api/src/middleware/unified-auth.ts` but built on the
 * `createUnifiedAuthMiddleware` skeleton from `@ezstart/api-core` rather
 * than the `createAuthMiddleware` factory from `@ezstart/auth-sdk/server`,
 * because ezpay does NOT have its own `auth_users` collection — JWT
 * payloads are decoded inline (`createApiAuth` from api-core) and the API
 * key path resolves owner identity from the local `api_keys` document
 * itself (each row carries `userId`, `applicationId`, `appSlug`, `scope`).
 *
 * What the SDK factory would have demanded
 * ----------------------------------------
 * `createAuthMiddleware({ getAuthUserModel, ... })` REQUIRES a Mongoose
 * AuthUser model so it can hydrate `req.user` from the DB on every
 * request. Ezpay deliberately avoids that round-trip — the JWT carries
 * everything we need (roles, app memberships, isVerified) and one cross-
 * service DB lookup per request would be untenable for a payment API.
 *
 * What this wrapper does instead
 * ------------------------------
 * - **JWT path** : reuses the existing `authMiddleware` (verifies HS256
 *   token via `JWT_SECRET`) chained with `populateUserFromToken`
 *   (decodes payload into `req.user`). Same exact shape as the legacy
 *   pattern so `isAdminUser`, `attachDerivedScope`, and every downstream
 *   consumer keep working unchanged.
 * - **API key path** : reuses the existing `validateApiKey` middleware
 *   (factory from `@ezstart/auth-sdk/server`'s `createApiKeyMiddleware`),
 *   then synthesises a minimal `req.user` from the loaded ApiKey
 *   document. The synthesised user has:
 *     - `userId` = `apiKey.userId` (key owner)
 *     - `appRoles[appSlug] = ['admin']` when `scope === 'admin'`
 *     - `globalRoles = []` (NEVER `'superadmin'` — keys don't grant that)
 *     - `isVerified: true` (the key itself is the verification token —
 *       it was minted by an authenticated owner who already verified
 *       their email at the dashboard)
 *   This synthesis makes `attachDerivedScope` derive `'myApps'` for an
 *   admin-scope ezpay key (so it sees its own Application data) and
 *   `'mine'` for a publishable / readonly key.
 *
 * Multi-tenancy guarantees
 * ------------------------
 * - An admin key bound to Application X (slug `acme`) gets
 *   `appRoles = { acme: ['admin'] }` → `attachDerivedScope` resolves
 *   `'myApps'` → handlers filter by the caller's owned slugs. The
 *   `apiKeyAppSlug` is also exposed via `req.apiKeyAppSlug` (already
 *   stamped by the api-key middleware) so handlers can scope strictly
 *   to that one slug if they want to ignore the JWT-style "any owned
 *   app" semantics.
 * - Routes that need to lock a Bearer JWT user to a specific
 *   Application (e.g., `POST /plans` with `applicationId` in body) keep
 *   doing the explicit ezauth ownership check via `getApplication()`.
 *   The unified middleware never bypasses that gate — it only makes the
 *   route reachable via either auth method.
 *
 * Scope policy
 * ------------
 * - JWT users : NOT scope-checked here. Chain `requireAdmin` /
 *   `isAdminUser` downstream when the route is admin-only.
 * - API keys : `requireKeyScope` filters the API key path:
 *     - `'admin'` rejects `ez_pk_*` (publishable, scope='user') with HTTP 403
 *     - `'user'` accepts both `ez_sk_*` and `ez_pk_*`
 *     - `'readonly'` accepts everything
 *   Defaults to `'user'`.
 *
 * @module apps/ezpay/api/src/middleware/unified-auth
 */

import {
  createUnifiedAuthMiddleware,
  type UnifiedApiKeyResult,
  type UnifiedAuthScope,
  type UnifiedJwtResult,
} from '@ezstart/api-core'
import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { authMiddleware, populateUserFromToken } from './auth.js'
import { validateApiKey } from './api-key.js'

/**
 * Per-route options for {@link authJwtOrKey}. Mirrors the auth-sdk
 * `AuthMiddlewareOptions` so consumers that switch backends don't need
 * to learn a new signature.
 */
export interface AuthJwtOrKeyOptions {
  /**
   * Minimum API-key scope required (defaults to `'user'`). Use
   * `'admin'` for admin / management routes so a publishable
   * `ez_pk_*` key (scope='user') is rejected with HTTP 403.
   */
  requireKeyScope?: UnifiedAuthScope
}

/**
 * Map the persisted scope (modern + legacy values) onto the canonical
 * `UnifiedAuthScope`. Legacy `'live'` / `'test'` are demoted to `'user'`
 * so a publishable key never satisfies `requireKeyScope: 'admin'`.
 */
function normaliseScope(stored: string | undefined | null): UnifiedAuthScope {
  if (stored === 'admin') return 'admin'
  if (stored === 'readonly') return 'readonly'
  return 'user'
}

/**
 * Run a chain of Express middlewares in order, resolving `true` if the
 * chain calls `next()` (success) or `false` if any middleware short-
 * circuits with `res.send/end/status` (failure already responded). The
 * promise rejects only when a middleware throws synchronously or
 * forwards an Error to `next(err)`.
 *
 * Used to compose `authMiddleware + populateUserFromToken` into a
 * single Promise-returning verifier consumable by
 * `createUnifiedAuthMiddleware`.
 */
function runMiddlewareChain(
  req: Request,
  res: Response,
  chain: RequestHandler[]
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let index = 0
    const dispatch = (err?: unknown): void => {
      if (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
        return
      }
      // If a middleware already responded (e.g. 401), don't keep calling.
      if (res.headersSent) {
        resolve(false)
        return
      }
      const handler = chain[index++]
      if (!handler) {
        resolve(true)
        return
      }
      try {
        handler(req, res, (e?: unknown) => dispatch(e))
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    }
    dispatch()
  })
}

/**
 * Detect whether the incoming request carries an API-key header. The JWT
 * path runs first when ABSENT — so the unified middleware must NOT
 * attempt JWT verification when an API key is present (otherwise it
 * could reject a perfectly valid key with a "Bearer token expired" 401
 * just because the consumer happened to send a stale cookie).
 */
function hasApiKeyHeader(req: Request): boolean {
  const xApiKey = req.headers['x-api-key']
  if (typeof xApiKey === 'string' && xApiKey.length > 0) return true
  const authHeader = req.headers.authorization
  if (typeof authHeader === 'string' && authHeader.startsWith('ApiKey ')) return true
  return false
}

/**
 * Detect whether the incoming request carries a JWT — either as a
 * `Bearer` Authorization header or via the legacy `ezauth_token` cookie.
 * Used to short-circuit the JWT verifier when no token is present so
 * we fall straight through to the API-key path without paying the cost
 * of the chained middleware.
 */
function hasJwtToken(req: Request): boolean {
  const authHeader = req.headers.authorization
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) return true
  const cookieHeader = req.headers.cookie || ''
  return cookieHeader.includes('ezauth_token=')
}

/**
 * After `validateApiKey` resolves, derive a minimal RBAC-shaped
 * `req.user` from the api-key context fields it stamped. This makes
 * `attachDerivedScope` (RBAC) and `isAdminUser` (admin gate) work on
 * the API-key path without route handlers having to special-case the
 * absence of `req.user`.
 *
 * Synthesis rules
 * ---------------
 * - `userId` = the key owner (`req.apiKeyUserId`)
 * - `globalRoles = []` — keys NEVER grant superadmin, even
 *   `ez_sk_admin_*` ones; a superadmin must be authenticated via the
 *   dashboard JWT
 * - `appRoles[apiKeyAppSlug] = ['admin']` when the key scope is
 *   `'admin'` — gives `attachDerivedScope` enough signal to derive
 *   `'myApps'` and lets `isAdminUser` return true so refund / delete /
 *   cleanup admin gates pass
 * - `apps = [apiKeyAppSlug]` — exposes the key's bound Application slug
 *   for downstream handlers that filter by `user.apps`
 * - `isVerified = true` — by construction, the dashboard owner who
 *   minted the key already verified their email
 */
function synthesiseUserFromApiKey(req: Request): void {
  const apiKeyUserId = (req as Request & { apiKeyUserId?: string }).apiKeyUserId
  const apiKeyAppSlug = (req as Request & { apiKeyAppSlug?: string }).apiKeyAppSlug
  const apiKeyScope = (req as Request & { apiKeyScope?: string }).apiKeyScope

  if (!apiKeyUserId) return // populator didn't run — defensive no-op

  const slug = apiKeyAppSlug ?? '*'
  const grantsAdmin = apiKeyScope === 'admin'

  ;(req as Request & { userId?: string }).userId = apiKeyUserId
  ;(req as Request & { user?: unknown }).user = {
    userId: apiKeyUserId,
    email: undefined,
    username: undefined,
    apps: slug === '*' ? [] : [slug],
    globalRoles: [],
    appRoles: grantsAdmin && slug !== '*' ? { [slug]: ['admin'] } : {},
    permissions: [],
    features: [],
  }
}

// Bound, app-scoped factory builder. Each call to `authJwtOrKey(opts)`
// returns a fresh `RequestHandler` parameterised by the per-route
// `requireKeyScope`. The verifiers themselves are stateless wrappers
// around the existing middlewares, so there's no shared cache to
// invalidate per call.
function buildVerifyJwt() {
  return async (req: Request, res: Response): Promise<UnifiedJwtResult> => {
    // Optimisation: avoid invoking the JWT chain when no token is
    // present (cookie or Bearer). This makes the API-key fallback
    // hit on cleanly without the chain emitting a 401 for "missing
    // token" and short-circuiting the whole request.
    if (!hasJwtToken(req)) return null

    try {
      const ok = await runMiddlewareChain(req, res, [authMiddleware, populateUserFromToken])
      if (ok) return { ok: true }
      // The chain responded (e.g., 401 token expired). DO NOT fall back
      // to the API key path — the verifier responded.
      return { ok: false, responded: true }
    } catch {
      // Verifier crashed. Let the unified skeleton emit the canonical
      // 500 envelope.
      return { ok: false, responded: false }
    }
  }
}

function buildVerifyApiKey() {
  return async (req: Request, res: Response): Promise<UnifiedApiKeyResult> => {
    if (!hasApiKeyHeader(req)) return null

    try {
      // `validateApiKey` is a Promise<void> handler — wrap into the
      // same chain helper so we get a clean ok/responded boolean back.
      const ok = await runMiddlewareChain(req, res, [validateApiKey as unknown as RequestHandler])
      if (!ok) return { ok: false, responded: true }

      // Populator ran — synthesise req.user for downstream RBAC.
      synthesiseUserFromApiKey(req)

      const storedScope = (req as Request & { apiKeyScope?: string }).apiKeyScope
      return { ok: true, scope: normaliseScope(storedScope) }
    } catch {
      return { ok: false, responded: false }
    }
  }
}

/**
 * Build a middleware that authenticates via JWT (cookie / Bearer) OR
 * EZPay API key (`X-API-Key` / `Authorization: ApiKey <key>`). Drop-in
 * replacement for the legacy `authMiddleware + populateUserFromToken`
 * pair for routes that should ALSO accept S2S API key calls.
 *
 * Pass `requireKeyScope: 'admin'` on admin / management routes so a
 * publishable key (`ez_pk_*`, scope='user') is rejected with HTTP 403.
 *
 * @example
 * ```ts
 * import { authJwtOrKey } from '../../middleware/unified-auth.js'
 *
 * docRouter.get(
 *   '/payments',
 *   authJwtOrKey(),
 *   attachDerivedScope,
 *   listPaymentsHandler,
 *   { ... }
 * )
 *
 * docRouter.post(
 *   '/plans',
 *   authJwtOrKey({ requireKeyScope: 'admin' }),
 *   createPlanHandler,
 *   { ... }
 * )
 * ```
 */
export function authJwtOrKey(opts: AuthJwtOrKeyOptions = {}): RequestHandler {
  return createUnifiedAuthMiddleware({
    verifyJwt: buildVerifyJwt(),
    verifyApiKey: buildVerifyApiKey(),
    requireKeyScope: opts.requireKeyScope ?? 'user',
  })
}

/**
 * Optional variant that allows anonymous requests to flow through (no
 * 401 when neither a JWT nor an API key is present). Used for public
 * endpoints that opportunistically read `req.userId` (e.g., `/donate`,
 * `/verify-payment/:sessionId`). When a JWT or API key IS present, it
 * is fully validated — invalid credentials still return 401.
 *
 * Note: when `requireKeyScope: 'admin'` is set, an authenticated
 * publishable key still gets a 403 — anonymity is permitted but a
 * known-and-insufficient key is not.
 */
export function authOptionalJwtOrKey(opts: AuthJwtOrKeyOptions = {}): RequestHandler {
  const enforced = authJwtOrKey(opts)
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!hasJwtToken(req) && !hasApiKeyHeader(req)) {
      next()
      return
    }
    enforced(req, res, next)
  }
}
