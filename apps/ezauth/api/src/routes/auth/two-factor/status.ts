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
import { TotpService } from '../../../services/totp.service.js'
import { logger } from '@ezstart/logger/server'

const { authMiddleware } = createAuthMiddleware()

export const twoFactorStatusRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(twoFactorStatusRegistry, router)

// GET /auth/2fa/status — returns whether 2FA is enabled for the user
const statusController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const isEnabled = await TotpService.isEnabled(userId)

    sendSuccess(res, { isEnabled })
  } catch (error) {
    logger.error('2FA status error:', error)
    sendError(res, error instanceof Error ? error.message : '2FA status check failed', 500)
  }
}

docRouter.get('/2fa/status', authMiddleware, statusController, {
  summary: 'Get 2FA status for current user',
  tags: ['Two-Factor Authentication'],
})

export default router
