import { createRoleMiddleware } from '@ezstart/api-core'
import { requireTwoFactor } from '../../middleware/require-two-factor.js'

/** Shared RBAC middleware for admin routes */
export const { requireAdmin, requireRole } = createRoleMiddleware()

/**
 * Singleton 2FA enforcement middleware shared across every admin route.
 *
 * Mounted AFTER `requireAdmin` so the middleware only sees requests that
 * already passed the role gate. Skipped automatically for admin API key
 * authenticated requests (S2S — the key IS the second factor).
 *
 * Industry pattern (Stripe / Clerk / Auth0): admin / superadmin must have
 * 2FA enrolled or every protected admin endpoint returns 403 +
 * `code: 'TWO_FACTOR_REQUIRED'` so the SDK guard can route the user to
 * `/settings?tab=2fa`.
 */
export const enforceAdminTwoFactor = requireTwoFactor()
