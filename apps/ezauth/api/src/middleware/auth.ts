/**
 * Authentication middleware for verifying JWT tokens
 * Extracts user info from token and attaches to req.user
 */

import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { JWTPayload } from '@ezstart/auth-sdk/server'
import { sendError } from '@ezstart/express-core'
import { getAuthUserModel } from '../models/auth-user.js'
import { updatePresenceByUserId } from '../services/presence.service.js'
import { logger } from '@ezstart/logger/server'
import { mapToRecord } from '../utils/map-to-record.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required')

/**
 * Middleware to verify JWT token and attach user to request
 * Supports both Authorization header and httpOnly cookies
 */
export async function verifyTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Try to get token from Authorization header
    let token: string | undefined

    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    // Fallback: Try to get token from httpOnly cookie
    if (!token && req.cookies?.ezauth_token) {
      token = req.cookies.ezauth_token
    }

    if (!token) {
      return sendError(res, 'Authentication required', 401)
    }

    // Verify token
    const payload = jwt.verify(token, JWT_SECRET!) as unknown as JWTPayload

    // Get full user from database to ensure fresh data
    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(payload.userId).select('-passwordHash').lean()

    if (!user) {
      return sendError(res, 'User not found', 401)
    }

    const userId = user._id.toString()

    // Attach user to request
    req.user = {
      _id: userId,
      userId,
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
    updatePresenceByUserId(userId)

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
 * Optional middleware - allows both authenticated and unauthenticated requests
 * Attaches user if token is valid, but doesn't reject if missing
 */
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Try to get token
    let token: string | undefined

    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    if (!token && req.cookies?.ezauth_token) {
      token = req.cookies.ezauth_token
    }

    // If no token, just continue without user
    if (!token) {
      return next()
    }

    // Verify token
    const payload = jwt.verify(token, JWT_SECRET!) as unknown as JWTPayload

    // Get full user from database
    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(payload.userId).select('-passwordHash').lean()

    if (user) {
      const userId = user._id.toString()
      req.user = {
        _id: userId,
        userId,
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
      updatePresenceByUserId(userId)
    }

    next()
  } catch (error) {
    // Silently fail - optional auth
    next()
  }
}
