import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { sendError } from '../helpers/api-response.js'

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i

/**
 * Extract and validate userId from JWT Bearer token or X-User-Id header fallback.
 * Returns userId if valid, null otherwise.
 */
function extractUserId(req: Request, jwtSecret: string): string | null {
  // 1. Try Bearer token (JWT signed by EZAuth)
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const decoded = jwt.verify(token, jwtSecret) as Record<string, unknown>
      const userId = (decoded.userId || decoded.sub || decoded.id) as string | undefined
      if (userId && OBJECT_ID_REGEX.test(userId)) {
        return userId
      }
    } catch {
      // Token invalid — fall through to X-User-Id fallback
    }
  }

  // 2. Try httpOnly cookie (set by EZAuth login-cookie flow)
  const cookieHeader = req.headers.cookie || ''
  const cookieToken = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('ezauth_token='))
    ?.split('=')[1]
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, jwtSecret) as Record<string, unknown>
      const userId = (decoded.userId || decoded.sub || decoded.id) as string | undefined
      if (userId && OBJECT_ID_REGEX.test(userId)) {
        return userId
      }
    } catch {
      // Cookie token invalid — fall through
    }
  }

  // 3. Fallback: X-User-Id header (legacy / dev only)
  const headerUserId = req.headers['x-user-id'] as string | undefined
  if (headerUserId && OBJECT_ID_REGEX.test(headerUserId)) {
    return headerUserId
  }

  return null
}

/**
 * Create an authentication middleware that verifies JWT Bearer tokens from EZAuth.
 * Falls back to X-User-Id header for backward compatibility (dev/legacy).
 *
 * @param jwtSecret - JWT secret string. Defaults to process.env.JWT_SECRET.
 */
export function createAuthMiddleware(jwtSecret?: string) {
  const resolved = jwtSecret ?? process.env.JWT_SECRET
  if (!resolved) throw new Error('JWT_SECRET environment variable is required')
  const secret: string = resolved

  function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const userId = extractUserId(req, secret)

    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    req.userId = userId
    next()
  }

  function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    const userId = extractUserId(req, secret)

    if (userId) {
      req.userId = userId
    }

    next()
  }

  return { authMiddleware, optionalAuthMiddleware }
}

/**
 * Create role-based access control middlewares.
 * Checks globalRoles and appRoles fields.
 *
 * Must be used AFTER an auth middleware that attaches `req.user` with role information.
 */
export function createRoleMiddleware() {
  return {
    requireAdmin: (req: Request, res: Response, next: NextFunction) => {
      const user = (
        req as Request & { user?: { globalRoles?: string[]; appRoles?: Record<string, string[]> } }
      ).user
      if (!req.userId && !user) return sendError(res, 'Authentication required', 401)
      const isAdmin =
        user?.globalRoles?.includes('superadmin') ||
        user?.globalRoles?.includes('admin') ||
        Object.values(user?.appRoles || {})
          .flat()
          .includes('admin')
      if (!isAdmin) return sendError(res, 'Admin access required', 403)
      next()
    },
    requireRole: (role: string) => (req: Request, res: Response, next: NextFunction) => {
      const user = (
        req as Request & { user?: { globalRoles?: string[]; appRoles?: Record<string, string[]> } }
      ).user
      if (!req.userId && !user) return sendError(res, 'Authentication required', 401)
      const hasRole =
        user?.globalRoles?.includes(role) ||
        Object.values(user?.appRoles || {})
          .flat()
          .includes(role)
      if (!hasRole) return sendError(res, `Role '${role}' required`, 403)
      next()
    },
  }
}
