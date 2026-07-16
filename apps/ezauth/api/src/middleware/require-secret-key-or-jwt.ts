/**
 * Middleware — reject requests authenticated via a PUBLISHABLE API key.
 *
 * Chain this AFTER `authJwtOrKey({ requireKeyScope: 'admin' })` (and
 * `requireAdmin` when present) on any admin route that returns PII, platform
 * analytics, cross-tenant Application metadata, or API-key inventory.
 *
 * ## Threat model (AUTH-SVC-ADMIN-ROUTES-PUBLISHABLE-KEY-LEAK-001)
 *
 * `NEXT_PUBLIC_EZAUTH_KEY` — the ezauth self-key — is a **publishable +
 * scope=admin** key that is embedded in every ezauth-web browser bundle. That
 * combination is normally harmless (publishable keys are meant to be public),
 * but the admin scope creates an escalation chain:
 *
 * 1. It passes `authJwtOrKey({ requireKeyScope: 'admin' })` (scope check OK).
 * 2. The auth-sdk `attachUserToRequest` sentinel (`userId: 'system'`) stamps
 *    `globalRoles: ['superadmin']` on `req.user`.
 * 3. `requireAdmin` therefore passes, and `enforceAdminTwoFactor` is skipped
 *    because `req.apiKeyId` is set (2FA is only enforced on the JWT path).
 * 4. → a browser visitor who extracts the key can enumerate all user PII,
 *    read platform analytics, reset the docs-demo dataset, and read/mutate
 *    Applications and API keys across every tenant.
 *
 * This gate closes the chain: it lets the JWT path through (a signed-in
 * superadmin driving the dashboard is a legitimate caller) and, on the API-key
 * path, requires the key to be `type: 'secret'`. Secret keys are server-only
 * (never shipped to a browser), so the publishable self-key is rejected while
 * the S2S secret keys that consumer apps (ezpay → ezauth, etc.) use keep
 * working.
 *
 * ### Why legacy `ezk_*` keys (no `type`) are rejected
 *
 * `req.apiKeyType` is stamped by the auth-sdk api-key-verifier ONLY when the
 * key document carries a `type` field (`'publishable' | 'secret'`). Modern
 * keys (`ez_pk_*` / `ez_sk_*`) always set it at mint time; legacy `ezk_*`
 * documents leave it `undefined`. An `undefined` type means we cannot prove
 * the key is server-only, so it is treated as untrusted and rejected — a
 * fail-closed default. Legacy keys must be rotated to `ez_sk_*` to regain
 * access to these endpoints.
 *
 * @module apps/ezauth/api/src/middleware/require-secret-key-or-jwt
 */

import type { Request, Response } from 'express'
import { sendError } from '@ezstart/api-core'

/**
 * Allow JWT-authenticated callers (superadmin dashboard) and secret-key S2S
 * callers; reject publishable and legacy (typeless) API keys with 403.
 *
 * @example
 * ```ts
 * docRouter.get(
 *   '/users',
 *   authJwtOrKey({ requireKeyScope: 'admin' }),
 *   requireAdmin,
 *   requireSecretKeyOrJwt, // ← reject publishable self-key
 *   enforceAdminTwoFactor,
 *   listUsersController,
 * )
 * ```
 */
export function requireSecretKeyOrJwt(
  req: Request,
  res: Response,
  next: (err?: unknown) => void
): void {
  const apiKeyId = (req as Request & { apiKeyId?: string }).apiKeyId
  if (!apiKeyId) {
    // No API key path — JWT-authenticated (already verified by authJwtOrKey +
    // requireAdmin upstream). Superadmin JWTs are trusted callers.
    return next()
  }
  const apiKeyType = (req as Request & { apiKeyType?: 'publishable' | 'secret' }).apiKeyType
  if (apiKeyType !== 'secret') {
    sendError(res, 'This endpoint requires a secret API key, not publishable', 403)
    return
  }
  next()
}
