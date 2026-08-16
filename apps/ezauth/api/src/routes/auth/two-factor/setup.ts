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
import { AuthService } from '../../../services/auth.service.js'
import { logger } from '@ezstart/logger/server'
import { toSafeErrorMessage } from '../../../utils/safe-error.js'
import QRCode from 'qrcode'
import { verifyTokenMiddleware as authMiddleware } from '../../../middleware/auth.js'
import { requireEmailVerified } from '../../../middleware/require-email-verified.js'

/**
 * MED-1 — intentional, client-safe 2FA-setup messages thrown by
 * {@link TotpService.generateSecret} / {@link AuthService.getUserById}.
 * Anything else collapses to a generic message.
 */
const SAFE_SETUP_MESSAGES = [
  '2FA is already enabled. Disable it first to reconfigure.',
  'User not found',
] as const

export const twoFactorSetupRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(twoFactorSetupRegistry, router)

// Rate-limit the setup endpoint to deter automated secret regeneration
// against an authenticated session (defense in depth — the auth
// middleware already gates access).
const setupRateLimiter = createStrictRateLimiter()

// POST /auth/2fa/setup — generates TOTP secret, returns QR code data URL
const setupController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const user = await AuthService.getUserById(userId)

    const { secret, uri } = await TotpService.generateSecret(userId, user.email)

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(uri)

    sendSuccess(res, {
      secret,
      qrCode: qrCodeDataUrl,
      uri,
    })
  } catch (error) {
    logger.error('2FA setup error:', error)
    sendError(
      res,
      toSafeErrorMessage(error, { allow: SAFE_SETUP_MESSAGES, fallback: '2FA setup failed' }),
      400
    )
  }
}

docRouter.post(
  '/2fa/setup',
  setupRateLimiter,
  authMiddleware,
  // HAC-HIGH-2 (2026-05-17) — 2FA enrollment is meaningless on an account
  // whose email is not yet verified (the attacker who grabbed the email
  // could enroll their own TOTP and lock out the real owner forever).
  // Cf. `standard-saas-security.md` §2.
  requireEmailVerified,
  setupController,
  {
    summary: 'Generate TOTP secret for 2FA setup',
    tags: ['Two-Factor Authentication'],
  }
)

export default router
