import { createRoleMiddleware } from '@ezstart/api-core'

/** Shared RBAC middleware for admin routes */
export const { requireAdmin, requireRole } = createRoleMiddleware()
