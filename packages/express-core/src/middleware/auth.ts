import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { sendError } from '../helpers/api-response.js'

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i

interface JwtUserPayload {
  userId: string
  email?: string
  username?: string
  apps?: string[]
  globalRoles?: string[]
  appRoles?: Record<string, string[]>
  permissions?: string[]
  features?: string[]
  [key: string]: unknown
}

interface ExtractResult {
  userId: string
  user?: JwtUserPayload
}

function buildUserFromDecoded(decoded: Record<string, unknown>): JwtUserPayload | undefined {
  const userId = (decoded.userId || decoded.sub || decoded.id) as string | undefined
  if (!userId || !OBJECT_ID_REGEX.test(userId)) return undefined
  return {
    userId,
    email: decoded.email as string | undefined,
    username: decoded.username as string | undefined,
    apps: decoded.apps as string[] | undefined,
    globalRoles: decoded.globalRoles as string[] | undefined,
    appRoles: decoded.appRoles as Record<string, string[]> | undefined,
    permissions: decoded.permissions as string[] | undefined,
    features: decoded.features as string[] | undefined,
  }
}

/**
 * Extract and validate userId from JWT Bearer token or X-User-Id header fallback.
 * Returns userId and decoded user payload if available, null otherwise.
 */
function extractAuth(req: Request, jwtSecret: string): ExtractResult | null {
  // 1. Try Bearer token (JWT signed by EZAuth)
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as Record<
        string,
        unknown
      >
      const user = buildUserFromDecoded(decoded)
      if (user) {
        return { userId: user.userId, user }
      }
    } catch {
      // Token invalid — fall through to cookie fallback
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
      const decoded = jwt.verify(cookieToken, jwtSecret, { algorithms: ['HS256'] }) as Record<
        string,
        unknown
      >
      const user = buildUserFromDecoded(decoded)
      if (user) {
        return { userId: user.userId, user }
      }
    } catch {
      // Cookie token invalid — fall through
    }
  }

  // 3. Fallback: X-User-Id header (legacy / dev only — no user payload)
  // SECURITY: This header is trivially spoofable, so it MUST NOT be honored in
  // production. Only accept it when NODE_ENV !== 'production' (dev/test).
  if (process.env.NODE_ENV !== 'production') {
    const headerUserId = req.headers['x-user-id'] as string | undefined
    if (headerUserId && OBJECT_ID_REGEX.test(headerUserId)) {
      return { userId: headerUserId }
    }
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
    const result = extractAuth(req, secret)

    if (!result) {
      return sendError(res, 'Authentication required', 401)
    }

    req.userId = result.userId
    if (result.user) {
      req.user = result.user
    }
    next()
  }

  function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    const result = extractAuth(req, secret)

    if (result) {
      req.userId = result.userId
      if (result.user) {
        req.user = result.user
      }
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
      if (!req.userId && !req.user) return sendError(res, 'Authentication required', 401)
      const user = req.user
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
      if (!req.userId && !req.user) return sendError(res, 'Authentication required', 401)
      const user = req.user
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
