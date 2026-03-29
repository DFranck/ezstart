import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { sendError } from '../helpers/api-response.js'

export function createCsrfMiddleware() {
  return {
    generateToken: (req: Request, res: Response, next: NextFunction) => {
      const token = crypto.randomBytes(32).toString('hex')
      res.cookie('csrf-token', token, {
        httpOnly: false,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      })
      res.setHeader('X-CSRF-Token', token)
      next()
    },
    verifyToken: (req: Request, res: Response, next: NextFunction) => {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
      const cookieToken = req.cookies?.['csrf-token']
      const headerToken = req.headers['x-csrf-token'] as string | undefined
      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return sendError(res, 'CSRF token mismatch', 403)
      }
      next()
    },
  }
}
