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
import { AuthService } from '../../../services/auth.service.js'
import { logger } from '@ezstart/logger/server'
import QRCode from 'qrcode'
import { verifyTokenMiddleware as authMiddleware } from '../../../middleware/auth.js'

export const twoFactorSetupRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(twoFactorSetupRegistry, router)

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
    sendError(res, error instanceof Error ? error.message : '2FA setup failed', 400)
  }
}

docRouter.post('/2fa/setup', authMiddleware, setupController, {
  summary: 'Generate TOTP secret for 2FA setup',
  tags: ['Two-Factor Authentication'],
})

export default router
