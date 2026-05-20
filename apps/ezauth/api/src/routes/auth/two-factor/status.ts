import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { TotpService } from '../../../services/totp.service.js'
import { logger } from '@ezstart/logger/server'
import { verifyTokenMiddleware as authMiddleware } from '../../../middleware/auth.js'

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
    // MED-1 — generic message; raw error.message would leak DB internals.
    logger.error('2FA status error:', error)
    sendError(res, '2FA status check failed', 500)
  }
}

docRouter.get('/2fa/status', authMiddleware, statusController, {
  summary: 'Get 2FA status for current user',
  tags: ['Two-Factor Authentication'],
})

export default router
