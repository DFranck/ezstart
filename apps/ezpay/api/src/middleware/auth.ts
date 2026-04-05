import { createAuthMiddleware } from '@ezstart/express-core'
import { hasAnyRole } from '@ezstart/rbac/client'
import type { Request, Response, NextFunction } from 'express'

export const { authMiddleware, optionalAuthMiddleware } = createAuthMiddleware()

/** User info decoded from the JWT token */
export interface JwtUser {
  userId: string
  email?: string
  username?: string
  apps?: string[]
  globalRoles?: string[]
  appRoles?: Record<string, string[]>
  permissions?: string[]
  features?: string[]
}

/**
 * Middleware that populates req.user from the JWT token payload.
 * Must be used AFTER authMiddleware (which sets req.userId).
 * Extracts user info (roles, permissions, etc.) directly from the token
 * without an extra DB call.
 */
export function populateUserFromToken(req: Request, _res: Response, next: NextFunction) {
  if (!req.userId) return next()

  let token: string | undefined

  // Extract token from Authorization header
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  // Fallback: extract from cookie
  if (!token) {
    const cookieHeader = req.headers.cookie || ''
    token = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('ezauth_token='))
      ?.split('=')[1]
  }

  if (token) {
    try {
      // Token already verified by authMiddleware — just decode the payload
      const payloadB64 = token.split('.')[1]
      if (payloadB64) {
        const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as Record<
          string,
          unknown
        >
        req.user = {
          userId: req.userId,
          email: decoded.email as string | undefined,
          username: decoded.username as string | undefined,
          apps: decoded.apps as string[] | undefined,
          globalRoles: decoded.globalRoles as string[] | undefined,
          appRoles: decoded.appRoles as Record<string, string[]> | undefined,
          permissions: decoded.permissions as string[] | undefined,
          features: decoded.features as string[] | undefined,
        }
      }
    } catch {
      // Decode failure is non-fatal — token was already verified by authMiddleware
    }
  }

  next()
}

/**
 * Check if the authenticated user has admin/superadmin role.
 * Delegates to @ezstart/rbac hasAnyRole for consistent role checking.
 */
export function isAdminUser(req: Request): boolean {
  if (!req.user) return false
  return hasAnyRole(
    req.user as unknown as Parameters<typeof hasAnyRole>[0],
    ['superadmin', 'admin'],
    'ezpay'
  )
}
