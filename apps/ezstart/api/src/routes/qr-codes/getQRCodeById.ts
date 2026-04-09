/**
 * GET /api/qr-codes/:id
 * Get a QR code by ID (auth required, ownership check or admin)
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { QRCode } from '../../models/QRCode.js'
import { isAdminFromToken } from './utils.js'

export const getQRCodeByIdRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const getQRCodeByIdRouter = createRouterWithDoc(getQRCodeByIdRegistry, router, '/qr-codes')

getQRCodeByIdRouter.get(
  '/:id',
  async (req, res) => {
    try {
      const { id } = req.params
      const userId = req.userId

      if (!userId) {
        return sendError(res, 'Authentication required', 401)
      }

      // @ts-expect-error - Mongoose findById type inference issue
      const qrCode = await QRCode.findById(id).lean().exec()

      if (!qrCode) {
        return sendError(res, 'QR code not found', 404)
      }

      // Ownership check: user must own the QR code or be admin
      const record = qrCode as Record<string, unknown>
      if (record.userId !== userId && !isAdminFromToken(req)) {
        return sendError(res, 'Forbidden — not QR code owner', 403)
      }

      return sendSuccess(res, {
        id: String(record._id),
        userId: record.userId as string,
        userEmail: record.userEmail as string | undefined,
        url: record.url as string,
        title: record.title as string | undefined,
        redirectType: record.redirectType as string,
        size: record.size as number,
        foreground: record.foreground as string,
        background: record.background as string,
        errorCorrection: record.errorCorrection as string,
        includeMargin: record.includeMargin as boolean,
        scansCount: record.scansCount as number,
        createdAt: record.createdAt as string,
        updatedAt: record.updatedAt as string,
      })
    } catch (error) {
      logger.error('[QR Codes] GetById error:', error)
      return sendError(res, 'Failed to get QR code')
    }
  },
  {
    summary: 'Get QR code by ID',
    tags: ['QR Codes'],
  }
)

export default router
