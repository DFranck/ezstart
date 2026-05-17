/**
 * EZAuth wiring of `@ezstart/auth-sdk/server`'s `createAuthMiddleware`.
 *
 * Re-exports `authJwtOrKey(opts)` so existing routes keep importing from this
 * module unchanged — the heavy lifting (JWT verify + API key verify + monthly
 * quota cache + presence update + scope normalisation + Stripe-pattern legacy
 * field stamping) lives in the SDK and is shared with every other
 * @ezstart-style API (ezpay next, then any future service).
 *
 * Why this matters
 * ----------------
 * Before the extraction, every API that wanted "JWT cookie OR API key" auth
 * had to copy ~336 lines of glue. The SDK factory shrinks that to a single
 * configuration object; the rest of this file is just consumer-side wiring
 * (env, models, presence hook, logger).
 *
 * Multi-tenancy
 * -------------
 * Routes still receive `req.user`, `req.userId`, `req.apiKeyId`,
 * `req.apiKeyUserId`, `req.apiKeyScope` and `req.apiKeyAppName` exactly as
 * before — the SDK stamps them identically to the previous in-house verifier
 * so `attachDerivedScope` and the legacy `req.apiKey*` consumers continue to
 * work without modification.
 *
 * @module apps/ezauth/api/src/middleware/unified-auth
 */

import {
  createAuthMiddleware,
  type AuthMiddleware,
  type AuthMiddlewareOptions,
} from '@ezstart/auth-sdk/server'
import { logger } from '@ezstart/logger/server'
import { JWT_SECRET } from '../config/env.js'
import { JWT_ISSUER, JWT_VERIFIER_AUDIENCE } from '../config/jwt.js'
import { ACCESS_COOKIE_NAME } from '../config/cookie.js'
import { getApiKeyModel } from '../models/api-key.js'
import { getApiKeyUsageModel } from '../models/api-key-usage.js'
import { getAuthUserModel } from '../models/auth-user.js'
import { updatePresenceByUserId } from '../services/presence.service.js'

// Bound, app-scoped factory. One instance per process — safe because every
// dependency (env, models, presence) is process-singleton.
//
// HAC-CRIT-2 — enforce iss/aud on every JWT verify so a token minted for
// another @ezstart API (or by an attacker bypassing the sign path) is
// rejected here. Mirrors the constants used in the standalone
// `middleware/auth.ts` verifier (which guards routes not going through
// the SDK-based unified middleware).
const authJwtOrKeyFactory = createAuthMiddleware({
  appName: 'ezauth',
  jwtSecret: JWT_SECRET,
  cookieName: ACCESS_COOKIE_NAME,
  issuer: JWT_ISSUER,
  audience: JWT_VERIFIER_AUDIENCE,
  getApiKeyModel: getApiKeyModel as never,
  getApiKeyUsageModel: getApiKeyUsageModel as never,
  getAuthUserModel: getAuthUserModel as never,
  onUserAttached: updatePresenceByUserId,
  logger,
})

export type AuthJwtOrKeyOptions = AuthMiddlewareOptions

/**
 * Build a middleware that authenticates via JWT (cookie/Bearer) OR API key
 * (`X-API-Key` / `Authorization: ApiKey`). Drop-in replacement for
 * `verifyTokenMiddleware` that ALSO accepts API keys.
 *
 * Pass `requireKeyScope: 'admin'` on admin routes so a publishable key
 * (`ez_pk_*`, scope='user') is rejected with HTTP 403.
 *
 * @example
 * ```ts
 * import { authJwtOrKey } from '../../middleware/unified-auth.js'
 *
 * docRouter.get(
 *   '/applications',
 *   authJwtOrKey({ requireKeyScope: 'admin' }),
 *   attachDerivedScope,
 *   listApplicationsController,
 *   { ... }
 * )
 * ```
 */
export function authJwtOrKey(opts: AuthJwtOrKeyOptions = {}): AuthMiddleware {
  return authJwtOrKeyFactory(opts)
}
