import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import { logger } from '@ezstart/logger/server'
import { z } from 'zod'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import jwt from 'jsonwebtoken'
import type { JWTPayload } from '@ezstart/auth-sdk/server'
import { hashRefreshToken, getRefreshTokenModel } from '../../models/refresh-token.js'

const JWT_SECRET = process.env.JWT_SECRET

export const logoutRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(logoutRegistry, router)

const logoutRequestSchema = z.object({
  refreshToken: z.string().optional(),
})

const logoutResponseSchema = z.object({
  message: z.string().describe('Success message'),
})

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  domain: process.env.NODE_ENV === 'production' ? '.ezstart.xyz' : undefined,
}

/**
 * Extract userId from JWT (cookie or Authorization header).
 * Returns null if no valid token — logout should still succeed.
 */
function extractUserIdFromRequest(req: Request): string | null {
  try {
    let token: string | undefined

    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    if (!token && req.cookies?.ezauth_token) {
      token = req.cookies.ezauth_token
    }

    if (!token || !JWT_SECRET) return null

    const payload = jwt.verify(token, JWT_SECRET) as unknown as JWTPayload
    return payload.userId ?? null
  } catch {
    // Token expired or invalid — still try to logout gracefully
    return null
  }
}

// Logout: clear httpOnly cookie + revoke refresh tokens
const logoutController = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = logoutRequestSchema.parse(req.body || {})
    const userId = extractUserIdFromRequest(req)

    if (refreshToken) {
      // Specific refresh token provided — revoke only that one
      try {
        const RefreshTokenModel = await getRefreshTokenModel()
        const tokenHash = hashRefreshToken(refreshToken)
        await RefreshTokenModel.updateOne({ tokenHash }, { $set: { isRevoked: true } })
        logger.debug('Revoked specific refresh token on logout')
      } catch (err) {
        logger.debug('Failed to revoke refresh token on logout:', err)
      }
    } else if (userId) {
      // No specific token — revoke ALL refresh tokens for this user (global logout)
      try {
        const revokedCount = await AuthService.revokeAllUserTokens(userId)
        logger.debug(`Revoked ${revokedCount} refresh tokens for user ${userId} on logout`)
      } catch (err) {
        logger.debug('Failed to revoke all user tokens on logout:', err)
      }
    }

    // Always clear httpOnly cookie
    res.clearCookie('ezauth_token', COOKIE_OPTIONS)
    sendSuccess(res, { message: 'Logged out successfully' })
  } catch (error) {
    logger.error('Logout error:', error)
    // Still clear cookie even on error
    res.clearCookie('ezauth_token', COOKIE_OPTIONS)
    sendSuccess(res, { message: 'Logged out successfully' })
  }
}

docRouter.post('/logout', logoutController, {
  summary: 'Logout, clear httpOnly cookie, and revoke refresh tokens',
  tags: ['Authentication'],
  bodySchema: logoutRequestSchema,
  responseSchema: logoutResponseSchema,
  status: 200,
})

export default router
