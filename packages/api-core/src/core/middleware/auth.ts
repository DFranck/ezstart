/**
 * Authentication middleware factory.
 *
 * The actual token verification is injected (`TokenVerifier`) so the core
 * stays agnostic: JWT (via `jose` / `jsonwebtoken`), PASETO, opaque session
 * lookup — all are equivalent here.
 *
 * On success the middleware hydrates `req.userId` and, when the verifier
 * returns a full payload, `req.user` with the authenticated user info.
 * Failure emits a structured `{ success: false, error }` envelope.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { sendError } from '../responses.js'
import type { AuthenticatedUser, TokenVerifier } from '../types.js'

const COOKIE_NAME = 'access_token'

/**
 * Config accepted by `createAuthMiddleware`.
 */
export type AuthMiddlewareConfig = {
  /** Token verifier — required. */
  verifyToken: TokenVerifier
  /**
   * Name of the cookie to inspect when no `Authorization: Bearer` header
   * is present. Default `'access_token'`. Set to `null` to disable the
   * cookie fallback entirely.
   */
  cookieName?: string | null
}

/**
 * Pair of middlewares produced by `createAuthMiddleware`:
 * - `requireAuth` — rejects unauthenticated requests with `401`.
 * - `optionalAuth` — hydrates `req.userId` / `req.user` when a valid token
 *   is present but lets anonymous requests pass through.
 */
export type AuthMiddlewares = {
  requireAuth: RequestHandler
  optionalAuth: RequestHandler
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization
  if (typeof header !== 'string') return null
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  return token.length > 0 ? token : null
}

function extractCookie(req: Request, cookieName: string): string | null {
  const cookieHeader = req.headers.cookie
  if (typeof cookieHeader !== 'string' || cookieHeader.length === 0) return null
  const prefix = `${cookieName}=`
  const found = cookieHeader
    .split(';')
    .map(chunk => chunk.trim())
    .find(chunk => chunk.startsWith(prefix))
  if (!found) return null
  const value = found.slice(prefix.length)
  return value.length > 0 ? value : null
}

async function resolveUser(
  req: Request,
  verifier: TokenVerifier,
  cookieName: string | null
): Promise<AuthenticatedUser | null> {
  const bearer = extractBearer(req)
  if (bearer) {
    const user = await verifier(bearer, 'bearer')
    if (user) return user
  }
  if (cookieName) {
    const cookieToken = extractCookie(req, cookieName)
    if (cookieToken) {
      const user = await verifier(cookieToken, 'cookie')
      if (user) return user
    }
  }
  return null
}

/**
 * Build a pair of authentication middlewares.
 *
 * @example
 * ```ts
 * import { createAuthMiddleware } from '@ezstart/api-core'
 *
 * const { requireAuth } = createAuthMiddleware({
 *   verifyToken: async token => verifyJwt(token, secret),
 * })
 *
 * app.get('/api/me', requireAuth, (req, res) => {
 *   res.json({ userId: req.userId })
 * })
 * ```
 */
export function createAuthMiddleware(config: AuthMiddlewareConfig): AuthMiddlewares {
  const { verifyToken } = config
  const cookieName = config.cookieName === undefined ? COOKIE_NAME : config.cookieName

  const requireAuth: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    resolveUser(req, verifyToken, cookieName)
      .then(user => {
        if (!user) {
          sendError(res, 'Authentication required', 401, { code: 'UNAUTHORIZED' })
          return
        }
        req.userId = user.userId
        req.user = user
        next()
      })
      .catch((err: unknown) => {
        sendError(res, 'Authentication failed', 401, {
          code: 'INVALID_TOKEN',
          details: err instanceof Error ? err.message : undefined,
        })
      })
  }

  const optionalAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
    resolveUser(req, verifyToken, cookieName)
      .then(user => {
        if (user) {
          req.userId = user.userId
          req.user = user
        }
        next()
      })
      .catch(() => {
        // Soft-fail: optional auth never blocks the request.
        next()
      })
  }

  return { requireAuth, optionalAuth }
}

/**
 * Create role-based access control middlewares.
 * Checks globalRoles and appRoles fields.
 *
 * Must be used AFTER an auth middleware that attaches `req.user` with role information.
 *
 * @example
 * ```ts
 * import { createRoleMiddleware } from '@ezstart/api-core'
 *
 * const { requireAdmin, requireRole } = createRoleMiddleware()
 *
 * app.get('/api/admin', requireAuth, requireAdmin, handler)
 * app.get('/api/editor', requireAuth, requireRole('editor'), handler)
 * ```
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
