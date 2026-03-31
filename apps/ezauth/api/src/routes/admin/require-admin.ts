import { createRoleMiddleware } from '@ezstart/express-core'

/** Shared RBAC middleware for admin routes */
export const { requireAdmin, requireRole } = createRoleMiddleware()
