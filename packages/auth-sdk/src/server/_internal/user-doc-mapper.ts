/**
 * AuthUser document → `req.user` payload mapper for the unified auth
 * middleware.
 *
 * Extracted from `auth-middleware.ts` (Wave D Lot 4). Pure transform: takes
 * a lean AuthUser document and the resolved id string, returns the exact
 * `req.user` shape the previous per-app implementations stamped — so
 * downstream middleware (e.g. `attachDerivedScope`, `requireRole`) keeps
 * working unchanged. The factory still owns the model fetch + presence hook;
 * only the shape-building is moved here.
 *
 * **Server-only.** Imported only by sibling `server/` modules.
 *
 * @internal
 * @module @ezstart/auth-sdk/server/_internal/user-doc-mapper
 */

import './server-only.js'

import type { AuthUserDoc } from './auth-middleware-types.js'

/** Coerce a Mongoose `appRoles` Map (or plain record) into a plain record. */
export function mapToRecord(
  map: Map<string, string[]> | Record<string, string[]> | undefined
): Record<string, string[]> {
  if (!map) return {}
  if (map instanceof Map) {
    return Object.fromEntries(map)
  }
  return map as Record<string, string[]>
}

/**
 * Build the `req.user` payload from a lean AuthUser document. The shape is
 * stamped exactly like the legacy implementations (string `_id`, normalised
 * `appRoles`, ISO date strings) for backward compatibility.
 */
export function buildAttachedUser(
  user: AuthUserDoc,
  resolvedUserId: string
): Record<string, unknown> {
  return {
    _id: resolvedUserId,
    userId: resolvedUserId,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    isVerified: user.isVerified,
    apps: user.apps,
    globalRoles: user.globalRoles ?? [],
    appRoles: mapToRecord(user.appRoles),
    permissions: user.permissions ?? [],
    features: user.features ?? [],
    organizationId: user.organizationId,
    managedBy: user.managedBy,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}
