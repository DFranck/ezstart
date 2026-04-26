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
import { AuditLogService } from '../../../services/audit-log.service.js'
import { logger } from '@ezstart/logger/server'
import { z } from 'zod'
import { verifyTokenMiddleware as authMiddleware } from '../../../middleware/auth.js'

export const twoFactorDisableRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(twoFactorDisableRegistry, router)

const disableSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').describe('TOTP verification code'),
})

// POST /auth/2fa/disable — disables 2FA (requires current code)
const disableController = async (req: Request, res: Response) => {
  try {
    const parsed = disableSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendError(res, 'Invalid code format. Must be 6 digits.', 400)
    }

    const userId = req.userId!
    await TotpService.disable(userId, parsed.data.code)

    void AuditLogService.createFromRequest(req, {
      userId,
      action: '2fa_disabled',
    })

    sendSuccess(res, { message: '2FA disabled successfully' })
  } catch (error) {
    logger.error('2FA disable error:', error)
    sendError(res, error instanceof Error ? error.message : '2FA disable failed', 400)
  }
}

docRouter.post('/2fa/disable', authMiddleware, disableController, {
  summary: 'Disable 2FA (requires current TOTP code)',
  tags: ['Two-Factor Authentication'],
  bodySchema: disableSchema,
})

export default router
