import { Request, Response, NextFunction } from 'express';

// Extend Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Simple authentication middleware
 * For now, expects userId in X-User-Id header
 * In production, this would decode JWT tokens
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // For demo purposes, get userId from X-User-Id header
  // In production, this would be extracted from JWT token
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'X-User-Id header is required'
    });
  }

  // Validate userId format (MongoDB ObjectId)
  const objectIdRegex = /^[a-f\d]{24}$/i;
  if (!objectIdRegex.test(userId)) {
    return res.status(400).json({
      error: 'Invalid User ID',
      message: 'X-User-Id must be a valid MongoDB ObjectId'
    });
  }

  // Attach userId to request object
  req.userId = userId;
  next();
}

/**
 * Optional auth middleware - doesn't fail if no userId provided
 * Useful for endpoints that can work with or without authentication
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;

  if (userId) {
    const objectIdRegex = /^[a-f\d]{24}$/i;
    if (objectIdRegex.test(userId)) {
      req.userId = userId;
    }
  }

  next();
}