/**
 * Authentication middleware for verifying JWT tokens
 * Extracts user info from token and attaches to req.user
 */

import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { JWTPayload } from '@ezstart/auth-sdk/server'
import { getAuthUserModel } from '../models/auth-user.js'
import { logger } from '@ezstart/logger/server'

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
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Verify token
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload

    // Get full user from database to ensure fresh data
    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(payload.userId).select('-passwordHash').lean()

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    // Convert appRoles Map to plain object (Mongoose .lean() may return Map or plain object)
    let appRolesObj: Record<string, string[]> = {}
    if (user.appRoles) {
      if (user.appRoles instanceof Map) {
        appRolesObj = Object.fromEntries(user.appRoles)
      } else {
        appRolesObj = user.appRoles as Record<string, string[]>
      }
    }

    // Attach user to request
    req.user = {
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      isVerified: user.isVerified,
      apps: user.apps,
      roles: user.roles || [], // Legacy - kept for backward compatibility
      globalRoles: user.globalRoles || [],
      appRoles: appRolesObj,
      permissions: user.permissions || [],
      features: user.features || [],
      organizationId: user.organizationId,
      managedBy: user.managedBy,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }

    next()
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }
    logger.error('Auth middleware error:', error)
    return res.status(500).json({ error: 'Authentication failed' })
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
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload

    // Get full user from database
    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(payload.userId).select('-passwordHash').lean()

    if (user) {
      // Convert appRoles Map to plain object (Mongoose .lean() may return Map or plain object)
      let appRolesObj: Record<string, string[]> = {}
      if (user.appRoles) {
        if (user.appRoles instanceof Map) {
          appRolesObj = Object.fromEntries(user.appRoles)
        } else {
          appRolesObj = user.appRoles as Record<string, string[]>
        }
      }

      req.user = {
        _id: user._id.toString(),
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        isVerified: user.isVerified,
        apps: user.apps,
        roles: user.roles || [], // Legacy - kept for backward compatibility
        globalRoles: user.globalRoles || [],
        appRoles: appRolesObj,
        permissions: user.permissions || [],
        features: user.features || [],
        organizationId: user.organizationId,
        managedBy: user.managedBy,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }
    }

    next()
  } catch (error) {
    // Silently fail - optional auth
    next()
  }
}
