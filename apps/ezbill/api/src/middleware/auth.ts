import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required')

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i

// Extend Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

/**
 * Extract and validate userId from JWT Bearer token or X-User-Id header fallback.
 * Returns userId if valid, null otherwise.
 */
function extractUserId(req: Request): string | null {
  // 1. Try Bearer token (JWT signed by EZAuth)
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const decoded = jwt.verify(token, JWT_SECRET!) as Record<string, unknown>
      const userId = (decoded.userId || decoded.sub || decoded.id) as string | undefined
      if (userId && OBJECT_ID_REGEX.test(userId)) {
        return userId
      }
    } catch {
      // Token invalid — fall through to X-User-Id fallback
    }
  }

  // 2. Fallback: X-User-Id header (legacy / dev only)
  const headerUserId = req.headers['x-user-id'] as string | undefined
  if (headerUserId && OBJECT_ID_REGEX.test(headerUserId)) {
    return headerUserId
  }

  return null
}

/**
 * Authentication middleware — verifies JWT Bearer token from EZAuth.
 * Falls back to X-User-Id header for backward compatibility (dev/legacy).
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = extractUserId(req)

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    })
  }

  req.userId = userId
  next()
}

/**
 * Optional auth middleware — doesn't fail if no userId provided.
 * Useful for endpoints that can work with or without authentication.
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = extractUserId(req)

  if (userId) {
    req.userId = userId
  }

  next()
}