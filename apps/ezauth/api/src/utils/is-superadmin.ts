import { isValidObjectId } from 'mongoose'
import { getAuthUserModel } from '../models/auth-user.js'

/**
 * Returns true if the given userId represents a caller with global superadmin
 * privileges. Handles the `'system'` sentinel (trusted platform-internal S2S
 * caller — admin scope validated upstream by the auth middleware) and
 * defensively guards against non-ObjectId userIds (returns false without
 * throwing Mongoose CastError).
 *
 * Used by the ownership check in application/api-key routes to allow
 * superadmin OR system callers to bypass tenant-owner restrictions.
 */
export async function isSuperadmin(userId: string): Promise<boolean> {
  if (userId === 'system') return true
  if (!isValidObjectId(userId)) return false
  const AuthUser = await getAuthUserModel()
  const user = await AuthUser.findById(userId).lean()
  return user?.globalRoles?.includes('superadmin') ?? false
}
