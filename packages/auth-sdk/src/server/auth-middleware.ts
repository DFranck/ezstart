/**
 * Drop-in unified auth middleware factory for any @ezstart-style API.
 *
 * Wires JWT (cookie / Bearer) **and** API key (`X-API-Key` /
 * `Authorization: ApiKey ...`) verification behind a single Express middleware
 * so admin / CRUD routes can accept BOTH dashboard sessions AND
 * server-to-server API key calls without 300+ lines of glue per service.
 *
 * Usage (5 lines per API):
 *
 * ```ts
 * import { createAuthMiddleware } from '@ezstart/auth-sdk/server'
 *
 * const authJwtOrKey = createAuthMiddleware({
 *   appName: 'ezauth',
 *   jwtSecret: JWT_SECRET,
 *   cookieName: ACCESS_COOKIE_NAME,
 *   getApiKeyModel,
 *   getApiKeyUsageModel,
 *   getAuthUserModel,
 *   onUserAttached: updatePresenceByUserId,
 * })
 *
 * router.get('/applications', authJwtOrKey({ requireKeyScope: 'admin' }), controller)
 * ```
 *
 * Architecture
 * ------------
 * - **Agnostic** — no import from `@ezstart/api-core`, `@ezstart/logger` or
 *   any specific Mongoose model type. Models are passed via factory functions
 *   typed against minimal structural interfaces (see below). The SDK ships
 *   the same skeleton pattern as `createUnifiedAuthMiddleware` from
 *   `@ezstart/api-core` (intentional duplication — the two layers serve
 *   different audiences: api-core is a generic skeleton for any verifier
 *   pair, auth-sdk is the opinionated factory for ezauth-shaped services).
 * - **Reusable across services** — ezauth, ezpay, and any future API can
 *   wire the same factory with its own models + secret. Zero per-API glue.
 * - **Backward-compatible** — `req.user`, `req.userId`, `req.apiKeyId`,
 *   `req.apiKeyUserId`, `req.apiKeyScope`, `req.apiKeyAppName` are all
 *   stamped exactly like the previous per-app implementations so downstream
 *   middleware (e.g. `attachDerivedScope`) keeps working unchanged.
 *
 * **Server-only export.** Do NOT import from client code — this module
 * intentionally has zero React or browser dependencies.
 *
 * @module @ezstart/auth-sdk/server/auth-middleware
 */

import './_internal/server-only.js'

import type { NextFunction, Request, Response } from 'express'
import type jwt from 'jsonwebtoken'
import {
  hashApiKey as defaultHashApiKey,
  detectKeyFormat as defaultDetectKeyFormat,
} from '../core/api-keys-crypto.js'
import {
  noopLogger,
  type AuthMiddleware,
  type AuthMiddlewareConfig,
  type AuthMiddlewareOptions,
  type AuthMiddlewareScope,
} from './_internal/auth-middleware-types.js'
import { sendErrorEnvelope } from './_internal/error-envelope.js'
import { meetsScope } from './_internal/auth-scope.js'
import { normaliseVerifyClaim } from './_internal/jwt-verify-options.js'
import { createAttachUser } from './_internal/attach-user.js'
import { createJwtVerifier, type JwtResult } from './_internal/jwt-verifier.js'
import { createApiKeyVerifier, type ApiKeyResult } from './_internal/api-key-verifier.js'

// ---------------------------------------------------------------------------
// Public types — defined in `./_internal/auth-middleware-types.ts` (Wave D
// Lot 4) and re-exported here so the `@ezstart/auth-sdk/server` barrel import
// path (`./auth-middleware.js`) is byte-for-byte unchanged.
// ---------------------------------------------------------------------------

export type {
  AuthMiddleware,
  AuthMiddlewareConfig,
  AuthMiddlewareLogger,
  AuthMiddlewareModel,
  AuthMiddlewareOptions,
  AuthMiddlewareScope,
  AuthUserDoc,
  ApiKeyDoc,
} from './_internal/auth-middleware-types.js'

// ---------------------------------------------------------------------------
// Internal helpers extracted to `./_internal/` (Wave D Lot 4):
//   - auth-middleware-types.ts → all public types + noopLogger
//   - error-envelope.ts        → sendErrorEnvelope + ErrorOptions
//   - auth-scope.ts            → normaliseScope + meetsScope
//   - jwt-verify-options.ts    → normaliseVerifyClaim (iss/aud HAC-CRIT-2)
//   - user-doc-mapper.ts       → mapToRecord + buildAttachedUser
//   - usage-window.ts          → getCurrentMonthPrefix/getTodayDate/getSecondsUntilNextMonth
//   - attach-user.ts           → createAttachUser
//   - jwt-verifier.ts          → createJwtVerifier
//   - api-key-verifier.ts      → createApiKeyVerifier
// All pure / behaviour-preserving.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build a drop-in unified auth middleware factory bound to a specific API's
 * config (JWT secret, cookie name, models, presence hook, ...).
 *
 * The returned function takes per-route options (`requireKeyScope`) and
 * yields an Express `RequestHandler` ready to register on any route.
 *
 * @example
 * ```ts
 * import { createAuthMiddleware } from '@ezstart/auth-sdk/server'
 * import { logger } from '@ezstart/logger/server'
 * import { JWT_SECRET } from '../config/env.js'
 * import { ACCESS_COOKIE_NAME } from '../config/cookie.js'
 * import { getApiKeyModel } from '../models/api-key.js'
 * import { getApiKeyUsageModel } from '../models/api-key-usage.js'
 * import { getAuthUserModel } from '../models/auth-user.js'
 * import { updatePresenceByUserId } from '../services/presence.service.js'
 *
 * export const authJwtOrKey = createAuthMiddleware({
 *   appName: 'ezauth',
 *   jwtSecret: JWT_SECRET,
 *   cookieName: ACCESS_COOKIE_NAME,
 *   getApiKeyModel,
 *   getApiKeyUsageModel,
 *   getAuthUserModel,
 *   onUserAttached: updatePresenceByUserId,
 *   logger,
 * })
 * ```
 */
export function createAuthMiddleware(
  config: AuthMiddlewareConfig
): (opts?: AuthMiddlewareOptions) => AuthMiddleware {
  const cookieName = config.cookieName ?? 'ez_access'
  const hash = config.hashApiKey ?? defaultHashApiKey
  const detectFormat = config.detectKeyFormat ?? defaultDetectKeyFormat
  const log = config.logger ?? noopLogger
  const cacheTtlMs = config.usageCacheTtlMs ?? 5 * 60 * 1000

  // HAC-CRIT-2 — normalise the iss/aud options into the tuple shape
  // `jsonwebtoken` expects (see `./_internal/jwt-verify-options.ts`). Bare
  // `string[]` is rejected at the type level because the lib insists on
  // `[string, ...string[]]`. Empty arrays degrade to "no enforcement"
  // (undefined) to keep the back-compat path.
  const verifyAudience: jwt.VerifyOptions['audience'] | undefined = normaliseVerifyClaim(
    config.audience
  )

  const verifyIssuer: jwt.VerifyOptions['issuer'] | undefined = normaliseVerifyClaim(config.issuer)

  // Per-factory monthly quota cache. Each instance has its own cache so
  // multiple factories (rare) don't share state. Tests can pass
  // `usageCacheTtlMs: 0` to disable caching entirely.
  const usageCache = new Map<string, { total: number; expiry: number }>()

  // -------------------------------------------------------------------------
  // Verifiers — built once per factory, closing over the resolved config +
  // shared usage cache. Extracted to `./_internal/{attach-user,jwt-verifier,
  // api-key-verifier}.ts` (Wave D Lot 4); semantics unchanged.
  // -------------------------------------------------------------------------

  const attachUserToRequest = createAttachUser(config)

  const verifyJwt = createJwtVerifier({
    jwtSecret: config.jwtSecret,
    cookieName,
    verifyIssuer,
    verifyAudience,
    attachUserToRequest,
    log,
  })

  const verifyApiKey = createApiKeyVerifier({
    config,
    hash,
    detectFormat,
    cacheTtlMs,
    usageCache,
    attachUserToRequest,
    log,
  })

  // -------------------------------------------------------------------------
  // Skeleton — JWT first, API key fallback, scope policy. Mirrors the api-core
  // unified-auth runtime intentionally (same DX, same semantics) but inlined
  // here so the SDK does not depend on `@ezstart/api-core`.
  // -------------------------------------------------------------------------

  return function buildMiddleware(opts: AuthMiddlewareOptions = {}): AuthMiddleware {
    const requiredScope = opts.requireKeyScope ?? 'user'

    return (req: Request, res: Response, next: NextFunction): void => {
      void runUnified(req, res, next, requiredScope)
    }

    async function runUnified(
      req: Request,
      res: Response,
      next: NextFunction,
      requiredScope: AuthMiddlewareScope
    ): Promise<void> {
      // ---- 1. JWT first (dashboard sessions) ----
      let jwtResult: JwtResult = null
      try {
        jwtResult = await verifyJwt(req, res)
      } catch {
        sendErrorEnvelope(res, 'Authentication failed', 500, {
          code: 'AUTH_INTERNAL_ERROR',
        })
        return
      }

      if (jwtResult?.ok === true) {
        next()
        return
      }
      if (jwtResult?.ok === false) {
        if (!jwtResult.responded) {
          sendErrorEnvelope(res, 'Invalid or expired token', 401, {
            code: 'INVALID_TOKEN',
          })
        }
        return
      }

      // ---- 2. API key fallback ----
      let keyResult: ApiKeyResult = null
      try {
        keyResult = await verifyApiKey(req, res)
      } catch {
        sendErrorEnvelope(res, 'Authentication failed', 500, {
          code: 'AUTH_INTERNAL_ERROR',
        })
        return
      }

      if (keyResult?.ok === true) {
        if (!meetsScope(keyResult.scope, requiredScope)) {
          sendErrorEnvelope(res, `Insufficient API key scope (required: ${requiredScope})`, 403, {
            code: 'INSUFFICIENT_SCOPE',
          })
          return
        }
        next()
        return
      }
      if (keyResult?.ok === false) {
        if (!keyResult.responded) {
          sendErrorEnvelope(res, 'Invalid API key', 401, { code: 'INVALID_API_KEY' })
        }
        return
      }

      // No JWT, no API key.
      sendErrorEnvelope(res, 'Authentication required', 401, { code: 'UNAUTHORIZED' })
    }
  }
}
