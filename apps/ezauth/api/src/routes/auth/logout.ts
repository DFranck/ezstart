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

export const logoutRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(logoutRegistry, router)

const logoutRequestSchema = z.object({
  refreshToken: z.string().optional(),
})

const logoutResponseSchema = z.object({
  message: z.string().describe('Success message'),
})

// Logout (clear httpOnly cookie + revoke refresh token)
const logoutController = async (req: Request, res: Response) => {
  try {
    // Revoke all user tokens if we can identify the user from cookie/header
    const { refreshToken } = logoutRequestSchema.parse(req.body || {})

    // If a refresh token was sent, revoke it specifically
    // Otherwise we just clear the cookie — the refresh token will expire naturally
    if (refreshToken) {
      try {
        // We don't have userId from the body, so we use the hash-based lookup approach
        // by revoking via the refresh access token flow (which validates and revokes)
        const { hashRefreshToken } = await import('../../models/refresh-token.js')
        const { getRefreshTokenModel } = await import('../../models/refresh-token.js')
        const RefreshTokenModel = await getRefreshTokenModel()
        const tokenHash = hashRefreshToken(refreshToken)
        await RefreshTokenModel.updateOne({ tokenHash }, { $set: { isRevoked: true } })
      } catch (err) {
        // Non-critical — we still clear the cookie
        logger.debug('Failed to revoke refresh token on logout:', err)
      }
    }

    // Clear httpOnly cookie
    res.clearCookie('ezauth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.ezstart.xyz' : undefined,
    })

    sendSuccess(res, { message: 'Logged out successfully' })
  } catch (error) {
    logger.error('Logout error:', error)
    // Still clear cookie even on error
    res.clearCookie('ezauth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.ezstart.xyz' : undefined,
    })
    sendSuccess(res, { message: 'Logged out successfully' })
  }
}

docRouter.post('/logout', logoutController, {
  summary: 'Logout, clear httpOnly cookie, and revoke refresh token',
  tags: ['Authentication'],
  bodySchema: logoutRequestSchema,
  responseSchema: logoutResponseSchema,
  status: 200,
})

export default router
