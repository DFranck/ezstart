/**
 * DELETE /api/qr-codes/:id
 * Delete a QR code (auth required, ownership check or admin)
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { QRCode } from '../../models/QRCode.js'
import { isAdminFromToken } from './utils.js'

export const deleteQRCodeRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const deleteQRCodeRouter = createRouterWithDoc(deleteQRCodeRegistry, router, '/qr-codes')

deleteQRCodeRouter.delete(
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

      // @ts-expect-error - Mongoose findByIdAndDelete type inference issue
      await QRCode.findByIdAndDelete(id)

      return sendSuccess(res, { message: 'QR code deleted' })
    } catch (error) {
      logger.error('[QR Codes] Delete error:', error)
      return sendError(res, 'Failed to delete QR code')
    }
  },
  {
    summary: 'Delete QR code',
    tags: ['QR Codes'],
  }
)

export default router
