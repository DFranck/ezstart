/**
 * `attachUserToRequest` builder for the unified auth middleware.
 *
 * Extracted from `auth-middleware.ts` (Wave D Lot 4). Loads the AuthUser
 * document, treats a soft-deleted user (`deletedAt` set) as missing, stamps
 * `req.userId` + `req.user` via {@link buildAttachedUser}, and fires the
 * best-effort presence hook. Behaviour is byte-identical to the inline
 * closure — only relocated so the factory file stays under the size budget.
 *
 * **Server-only.** Imported only by sibling `server/` modules.
 *
 * @internal
 * @module @ezstart/auth-sdk/server/_internal/attach-user
 */

import './server-only.js'

import type { Request } from 'express'
import type { AuthMiddlewareConfig } from './auth-middleware-types.js'
import { buildAttachedUser } from './user-doc-mapper.js'

/**
 * Build the `attachUserToRequest` closure bound to a specific middleware
 * config (AuthUser model getter + optional presence hook).
 *
 * @returns `true` when the user was found + attached; `false` when missing
 *   or soft-deleted.
 */
export function createAttachUser(
  config: Pick<AuthMiddlewareConfig, 'getAuthUserModel' | 'onUserAttached'>
): (req: Request, userId: string) => Promise<boolean> {
  return async function attachUserToRequest(req: Request, userId: string): Promise<boolean> {
    const AuthUser = await config.getAuthUserModel()
    const user = await AuthUser.findById(userId).select('-passwordHash').lean()
    if (!user) return false
    if (user.deletedAt) return false

    const resolvedUserId = typeof user._id === 'string' ? user._id : user._id.toString()
    ;(req as Request & { userId?: string }).userId = resolvedUserId
    req.user = buildAttachedUser(user, resolvedUserId) as Request['user']
    if (config.onUserAttached) {
      try {
        config.onUserAttached(resolvedUserId)
      } catch {
        // presence hook is best-effort, never fail the request
      }
    }
    return true
  }
}
