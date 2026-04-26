import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createStrictRateLimiter,
  sendSuccess,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import { AuditLogService } from '../../services/audit-log.service.js'
import { logger } from '@ezstart/logger/server'
import { z } from 'zod'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import jwt from 'jsonwebtoken'
import type { JWTPayload } from '@ezstart/auth-sdk/server'
import { hashRefreshToken, getRefreshTokenModel } from '../../models/refresh-token.js'
import { JWT_SECRET } from '../../config/env.js'
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildAuthCookieClearOptions,
  buildRefreshCookieClearOptions,
} from '../../config/cookie.js'
import { verifyCookieCsrf } from '../../middleware/csrf.js'

export const logoutRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(logoutRegistry, router)

const logoutRateLimiter = createStrictRateLimiter()

const logoutRequestSchema = z.object({
  refreshToken: z
    .string()
    .optional()
    .describe('Refresh token (or provided via ezauth_refresh cookie)'),
})

const logoutResponseSchema = z.object({
  message: z.string().describe('Success message'),
})

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

    if (!token && req.cookies?.[ACCESS_COOKIE_NAME]) {
      token = req.cookies[ACCESS_COOKIE_NAME]
    }

    if (!token) return null

    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as unknown as JWTPayload
    return payload.userId ?? null
  } catch {
    // Token expired or invalid — still try to logout gracefully
    return null
  }
}

// Logout: clear httpOnly cookies + revoke refresh tokens
const logoutController = async (req: Request, res: Response) => {
  const clearCookies = () => {
    res.clearCookie(ACCESS_COOKIE_NAME, buildAuthCookieClearOptions())
    res.clearCookie(REFRESH_COOKIE_NAME, buildRefreshCookieClearOptions())
  }

  try {
    const parsedBody = logoutRequestSchema.safeParse(req.body ?? {})
    const bodyRefreshToken = parsedBody.success ? parsedBody.data.refreshToken : undefined
    const cookieRefreshToken: string | undefined = req.cookies?.[REFRESH_COOKIE_NAME]
    const refreshToken = bodyRefreshToken || cookieRefreshToken
    const userId = extractUserIdFromRequest(req)

    if (refreshToken) {
      // Specific refresh token provided — revoke only that one (with ownership check)
      try {
        const RefreshTokenModel = await getRefreshTokenModel()
        const tokenHash = hashRefreshToken(refreshToken)
        // Only revoke if the token belongs to the requesting user (prevents
        // an attacker from revoking another user's token via a guessed value)
        const filter: Record<string, unknown> = { tokenHash }
        if (userId) {
          filter.userId = userId
        }
        await RefreshTokenModel.updateOne(filter, { $set: { isRevoked: true } })
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

    if (userId) {
      // Fire-and-forget audit log entry — failure must not block logout.
      void AuditLogService.createFromRequest(req, {
        userId,
        action: 'logout',
      })
    }

    clearCookies()
    sendSuccess(res, { message: 'Logged out successfully' })
  } catch (error) {
    logger.error('Logout error:', error)
    // Still clear cookies even on error
    clearCookies()
    sendSuccess(res, { message: 'Logged out successfully' })
  }
}

docRouter.post('/logout', logoutRateLimiter, verifyCookieCsrf, logoutController, {
  summary: 'Logout, clear httpOnly cookies, and revoke refresh tokens',
  tags: ['Authentication'],
  bodySchema: logoutRequestSchema,
  responseSchema: logoutResponseSchema,
  status: 200,
  extraResponses: {
    429: { description: 'Too many requests', schema: errorResponseSchema },
  },
})

export default router
