import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createStrictRateLimiter,
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

// Rate-limit disable to deter session-hijack attackers from brute
// forcing the TOTP code.
const disableRateLimiter = createStrictRateLimiter()

// `password` is optional during the deprecation window so existing
// SDK consumers keep working. Future major release: make it mandatory
// for defense-in-depth (a stolen session alone must not be able to
// disable 2FA).
const disableSchema = z.object({
  code: z
    .string()
    .min(6, 'Code must be at least 6 characters')
    .describe('TOTP verification code or backup code'),
  password: z
    .string()
    .min(1)
    .optional()
    .describe('Account password (recommended — defense in depth)'),
})

// POST /auth/2fa/disable — disables 2FA (requires current code, optionally password)
const disableController = async (req: Request, res: Response) => {
  try {
    const parsed = disableSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendError(res, 'Invalid request', 400)
    }

    const userId = req.userId!
    await TotpService.disable(userId, parsed.data.code, parsed.data.password)

    void AuditLogService.createFromRequest(req, {
      userId,
      action: '2fa_disabled',
      metadata: { passwordVerified: typeof parsed.data.password === 'string' },
    })

    sendSuccess(res, { message: '2FA disabled successfully' })
  } catch (error) {
    logger.error('2FA disable error:', error)
    sendError(res, error instanceof Error ? error.message : '2FA disable failed', 400)
  }
}

docRouter.post('/2fa/disable', disableRateLimiter, authMiddleware, disableController, {
  summary: 'Disable 2FA (requires current TOTP code or backup code)',
  tags: ['Two-Factor Authentication'],
  bodySchema: disableSchema,
})

export default router
