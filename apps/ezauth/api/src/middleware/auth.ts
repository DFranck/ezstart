/**
 * Authentication middleware for verifying JWT tokens.
 * Extracts user info from token and attaches to req.user.
 */

import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { JWTPayload } from '@ezstart/auth-sdk/server'
import { sendError } from '@ezstart/api-core'
import { getAuthUserModel } from '../models/auth-user.js'
import { updatePresenceByUserId } from '../services/presence.service.js'
import { logger } from '@ezstart/logger/server'
import { mapToRecord } from '../utils/map-to-record.js'
import { JWT_SECRET } from '../config/env.js'
import { ACCESS_COOKIE_NAME } from '../config/cookie.js'

/** Extract a Bearer/cookie token from the request, or return undefined. */
function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME]
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken
  }
  return undefined
}

/** Load the user from Mongo and hydrate `req.user`. Returns false if not found. */
async function attachUserToRequest(req: Request, userId: string): Promise<boolean> {
  const AuthUser = await getAuthUserModel()
  const user = await AuthUser.findById(userId).select('-passwordHash').lean()
  if (!user) return false

  const resolvedUserId = user._id.toString()
  req.userId = resolvedUserId
  req.user = {
    _id: resolvedUserId,
    userId: resolvedUserId,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    isVerified: user.isVerified,
    apps: user.apps,
    globalRoles: user.globalRoles || [],
    appRoles: mapToRecord(user.appRoles),
    permissions: user.permissions || [],
    features: user.features || [],
    organizationId: user.organizationId,
    managedBy: user.managedBy,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }

  // Fire-and-forget presence update (throttled, non-blocking)
  updatePresenceByUserId(resolvedUserId)
  return true
}

/**
 * Middleware to verify JWT token and attach user to request.
 * Supports both Authorization header and httpOnly cookies.
 */
export async function verifyTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req)
    if (!token) {
      return sendError(res, 'Authentication required', 401)
    }

    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as unknown as JWTPayload

    const attached = await attachUserToRequest(req, payload.userId)
    if (!attached) {
      return sendError(res, 'User not found', 401)
    }

    next()
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid token', 401)
    }
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      return sendError(res, 'Token expired', 401)
    }
    logger.error('Auth middleware error:', error)
    return sendError(res, 'Authentication failed', 500)
  }
}

/**
 * Optional middleware — allows both authenticated and unauthenticated requests.
 * Attaches user if token is valid, but doesn't reject if missing.
 */
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req)
    if (!token) {
      return next()
    }

    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as unknown as JWTPayload
    await attachUserToRequest(req, payload.userId)
    next()
  } catch {
    // Silently fail — optional auth
    next()
  }
}
