import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createStrictRateLimiter,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import { logger } from '@ezstart/logger/server'
import { z } from 'zod'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'

export const refreshRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(refreshRegistry, router)

// Rate limiting for refresh endpoint (10 req/min per IP)
const refreshRateLimiter = createStrictRateLimiter()

const refreshRequestSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required')
    .describe('Refresh token for obtaining new access tokens'),
})

const refreshResponseSchema = z.object({
  accessToken: z.string().describe('New short-lived access token'),
  refreshToken: z.string().describe('New refresh token (rotated)'),
  expiresIn: z.number().describe('Access token TTL in seconds'),
  user: z.object({}).passthrough().describe('User info'),
})

const refreshController = async (req: Request, res: Response) => {
  try {
    const parsed = refreshRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendError(res, 'Invalid request: refreshToken is required', 400)
    }

    const result = await AuthService.refreshAccessToken(parsed.data.refreshToken, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    })

    sendSuccess(res, {
      accessToken: result.access_token,
      refreshToken: result.refreshToken,
      expiresIn: result.expires_in,
      user: result.user,
    })
  } catch (error) {
    logger.error('Refresh token error:', error)
    sendError(res, error instanceof Error ? error.message : 'Token refresh failed', 401)
  }
}

docRouter.post('/refresh', refreshRateLimiter, refreshController, {
  summary: 'Refresh access token using a refresh token (with rotation)',
  tags: ['Authentication'],
  bodySchema: refreshRequestSchema,
  responseSchema: refreshResponseSchema,
  extraResponses: {
    401: { description: 'Invalid or expired refresh token', schema: errorResponseSchema },
    429: { description: 'Too many requests', schema: errorResponseSchema },
  },
})

export default router
