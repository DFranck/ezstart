import { getAuthUserModel } from '../models/auth-user.js'

// Throttle lastActiveAt updates to once per minute per user
const PRESENCE_THROTTLE_MS = 60_000
const lastPresenceUpdate = new Map<string, number>()

/**
 * Fire-and-forget update of lastActiveAt for a user.
 * Throttled to once per minute per user to avoid excessive DB writes.
 */
export function updatePresenceByUserId(userId: string): void {
  const now = Date.now()
  const lastUpdate = lastPresenceUpdate.get(userId) || 0

  if (now - lastUpdate < PRESENCE_THROTTLE_MS) return

  lastPresenceUpdate.set(userId, now)

  // Non-blocking — don't await, don't slow down the request
  getAuthUserModel()
    .then(AuthUser =>
      AuthUser.updateOne({ _id: userId }, { $set: { lastActiveAt: new Date(now) } })
    )
    .catch(() => {
      // Silently ignore — presence tracking is best-effort
    })
}
