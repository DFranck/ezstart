import { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

/**
 * Authentication middleware — requires X-User-Id header.
 * In production, this would decode JWT tokens.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string

  if (!userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'X-User-Id header is required',
    })
  }

  const objectIdRegex = /^[a-f\d]{24}$/i
  if (!objectIdRegex.test(userId)) {
    return res.status(400).json({
      error: 'Invalid User ID',
      message: 'X-User-Id must be a valid MongoDB ObjectId',
    })
  }

  req.userId = userId
  next()
}

/**
 * Optional auth — attaches userId if present, doesn't block if missing.
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
