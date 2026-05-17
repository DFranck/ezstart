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
import { requireEmailVerified } from '../../../middleware/require-email-verified.js'

export const twoFactorVerifyRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(twoFactorVerifyRegistry, router)

// Rate-limit verify to prevent brute-forcing the TOTP setup code
// against an authenticated session (auth middleware gates access).
const verifyRateLimiter = createStrictRateLimiter()

const verifyCodeSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').describe('TOTP verification code'),
})

// POST /auth/2fa/verify — verifies a TOTP code to complete setup
const verifyController = async (req: Request, res: Response) => {
  try {
    const parsed = verifyCodeSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendError(res, 'Invalid code format. Must be 6 digits.', 400)
    }

    const userId = req.userId!
    const { backupCodes } = await TotpService.verifyAndEnable(userId, parsed.data.code)

    void AuditLogService.createFromRequest(req, {
      userId,
      action: '2fa_enabled',
    })

    sendSuccess(res, {
      message: '2FA enabled successfully',
      backupCodes,
    })
  } catch (error) {
    logger.error('2FA verify error:', error)
    sendError(res, error instanceof Error ? error.message : '2FA verification failed', 400)
  }
}

docRouter.post(
  '/2fa/verify',
  verifyRateLimiter,
  authMiddleware,
  // HAC-HIGH-2 (2026-05-17) — completing 2FA setup (which generates backup
  // codes) on an unverified account would let an attacker holding only
  // the signup credential lock the real owner out permanently. Gate the
  // enable step behind email verification (paired with /2fa/setup).
  requireEmailVerified,
  verifyController,
  {
    summary: 'Verify TOTP code to complete 2FA setup',
    tags: ['Two-Factor Authentication'],
    bodySchema: verifyCodeSchema,
  }
)

export default router
