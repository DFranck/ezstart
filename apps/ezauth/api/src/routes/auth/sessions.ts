import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  createAuthMiddleware,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import { hashRefreshToken } from '../../models/refresh-token.js'
import { logger } from '@ezstart/logger/server'
import { z } from 'zod'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'

const { authMiddleware } = createAuthMiddleware()

export const sessionsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(sessionsRegistry, router)

const sessionSchema = z.object({
  id: z.string().describe('Session ID'),
  userAgent: z.string().nullable().describe('Browser/device user agent'),
  ip: z.string().nullable().describe('IP address'),
  createdAt: z.string().describe('Session creation date ISO string'),
  expiresAt: z.string().describe('Session expiration date ISO string'),
  isCurrent: z.boolean().describe('Whether this is the current session'),
})

const sessionsResponseSchema = z.object({
  sessions: z.array(sessionSchema).describe('Active sessions'),
})

const deleteSessionResponseSchema = z.object({
  message: z.string().describe('Success message'),
})

// GET /auth/sessions — list active sessions
const listSessionsController = async (req: Request, res: Response) => {
  try {
    // Hash the refresh token from header to identify the current session
    const rawRefreshToken = req.headers['x-refresh-token'] as string | undefined
    const currentTokenHash = rawRefreshToken ? hashRefreshToken(rawRefreshToken) : undefined

    const sessions = await AuthService.getUserSessions(req.userId!, currentTokenHash)
    sendSuccess(res, { sessions })
  } catch (error) {
    logger.error('List sessions error:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to list sessions', 500)
  }
}

// DELETE /auth/sessions/:id — revoke a specific session
const revokeSessionController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!id) {
      return sendError(res, 'Session ID is required', 400)
    }
    await AuthService.revokeRefreshToken(id, req.userId!)
    sendSuccess(res, { message: 'Session revoked successfully' })
  } catch (error) {
    logger.error('Revoke session error:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to revoke session', 400)
  }
}

// DELETE /auth/sessions — revoke all sessions (logout everywhere)
const revokeAllSessionsController = async (req: Request, res: Response) => {
  try {
    const count = await AuthService.revokeAllUserTokens(req.userId!)
    sendSuccess(res, { message: `${count} session(s) revoked` })
  } catch (error) {
    logger.error('Revoke all sessions error:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to revoke sessions', 500)
  }
}

docRouter.get('/sessions', authMiddleware, listSessionsController, {
  summary: 'List active sessions for the current user',
  tags: ['Sessions'],
  responseSchema: sessionsResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorResponseSchema },
  },
})

docRouter.delete('/sessions/:id', authMiddleware, revokeSessionController, {
  summary: 'Revoke a specific session',
  tags: ['Sessions'],
  responseSchema: deleteSessionResponseSchema,
  extraResponses: {
    400: { description: 'Session not found or already revoked', schema: errorResponseSchema },
    401: { description: 'Authentication required', schema: errorResponseSchema },
  },
})

docRouter.delete('/sessions', authMiddleware, revokeAllSessionsController, {
  summary: 'Revoke all sessions (logout everywhere)',
  tags: ['Sessions'],
  responseSchema: deleteSessionResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorResponseSchema },
  },
})

export default router
