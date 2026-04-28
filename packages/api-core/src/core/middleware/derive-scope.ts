/**
 * RBAC scope derivation middleware.
 *
 * Reads `req.user` (populated by an auth middleware that ran upstream) and
 * derives an audience scope:
 *
 *   - `'all'`     — superadmin (`globalRoles` includes `'superadmin'`)
 *   - `'myApps'`  — app-level admin (any `appRoles[*]` includes `'admin'` or
 *                   `globalRoles` includes `'admin'`)
 *   - `'mine'`    — regular authenticated user (or unauthenticated request)
 *
 * The derived value is stored on `req.derivedScope` so downstream handlers can
 * apply scope-based filtering without re-implementing the role lookup logic.
 *
 * Superadmins MAY override the derived value by passing `?scope=mine|myApps|all`
 * in the query string — useful for debugging "view as another role". Non-
 * superadmins cannot override (the param is ignored if their derived scope
 * is anything other than `'all'`).
 *
 * Place AFTER an auth middleware (`requireAuth` / `verifyTokenMiddleware`)
 * and BEFORE the controller.
 *
 * @module @ezstart/api-core/middleware/derive-scope
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'

/**
 * Audience scope derived from the authenticated user's roles.
 *
 * - `'mine'`   — only records owned by the current user (or no records when
 *                used on platform-wide endpoints).
 * - `'myApps'` — records belonging to applications the current user owns
 *                (handler is responsible for resolving owned apps).
 * - `'all'`    — no scope filter (superadmin only).
 */
export type DerivedScope = 'mine' | 'myApps' | 'all'

const VALID_SCOPES: ReadonlySet<string> = new Set(['mine', 'myApps', 'all'])

function deriveBaseScope(user: Request['user'] | undefined): DerivedScope {
  if (!user) return 'mine'

  if (user.globalRoles?.includes('superadmin')) {
    return 'all'
  }

  const appRoleValues = Object.values(user.appRoles ?? {})
  const isAppAdmin = appRoleValues.some(roles => Array.isArray(roles) && roles.includes('admin'))
  const isGlobalAdmin = user.globalRoles?.includes('admin') === true

  if (isAppAdmin || isGlobalAdmin) {
    return 'myApps'
  }

  return 'mine'
}

/**
 * Express middleware that derives `req.derivedScope` from `req.user`.
 *
 * Must be placed AFTER an auth middleware that populates `req.user`. When no
 * user is present (anonymous request), `req.derivedScope` is set to `'mine'`
 * — handlers should still gate access independently when needed.
 *
 * Supports an optional `?scope=mine|myApps|all` query override that is honoured
 * ONLY when the base derived scope is `'all'` (superadmin debugging hatch).
 *
 * @example
 * ```ts
 * import { attachDerivedScope } from '@ezstart/api-core'
 *
 * router.get(
 *   '/admin/users',
 *   verifyTokenMiddleware,
 *   requireAdmin,
 *   attachDerivedScope,
 *   async (req, res) => {
 *     if (req.derivedScope === 'all') {
 *       // no filter — superadmin
 *     } else if (req.derivedScope === 'myApps') {
 *       // filter by owned apps
 *     } else {
 *       // mine — single user
 *     }
 *   }
 * )
 * ```
 */
export const attachDerivedScope: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const baseScope = deriveBaseScope(req.user)
  let scope: DerivedScope = baseScope

  // Superadmin override hatch — accept ?scope=... when the user is allowed
  // to see everything. For non-superadmins we ignore the param to prevent
  // privilege escalation via query string.
  if (baseScope === 'all') {
    const raw = req.query?.scope
    if (typeof raw === 'string' && VALID_SCOPES.has(raw)) {
      scope = raw as DerivedScope
    }
  }

  req.derivedScope = scope
  next()
}
