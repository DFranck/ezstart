import { Request, Response, NextFunction } from 'express'
import { sendError } from '@ezstart/express-core'

// Extend Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

/**
 * Simple authentication middleware
 * For now, expects userId in X-User-Id header
 * In production, this would decode JWT tokens
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string

  if (!userId) {
    return sendError(res, 'Unauthorized: X-User-Id header is required', 401)
  }

  // Validate userId format (MongoDB ObjectId)
  const objectIdRegex = /^[a-f\d]{24}$/i
  if (!objectIdRegex.test(userId)) {
    return sendError(res, 'Invalid User ID: X-User-Id must be a valid MongoDB ObjectId', 400)
  }

  req.userId = userId
  next()
}

/**
 * Optional auth middleware - doesn't fail if no userId provided
 * Useful for endpoints that can work with or without authentication
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string

  if (userId) {
    const objectIdRegex = /^[a-f\d]{24}$/i
    if (objectIdRegex.test(userId)) {
      req.userId = userId
    }
  }

  next()
}
