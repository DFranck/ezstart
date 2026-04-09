/**
 * GET /api/qr-codes
 * List QR codes (auth required)
 * - Regular users: see only their own QR codes
 * - Admin/Superadmin: see all, with optional ?userId= filter
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { z } from 'zod'
import { QRCode } from '../../models/QRCode.js'
import { isAdminFromToken } from './utils.js'

const ListQRCodesQuerySchema = z.object({
  userId: z.string().optional().describe('Filter by user ID (admin only)'),
  limit: z.coerce.number().min(1).max(100).default(20).describe('Max items per page'),
  offset: z.coerce.number().min(0).default(0).describe('Number of items to skip'),
})

export const listQRCodesRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const listQRCodesRouter = createRouterWithDoc(listQRCodesRegistry, router, '/qr-codes')

listQRCodesRouter.get(
  '/',
  async (req, res) => {
    try {
      const validation = ListQRCodesQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
      }

      const currentUserId = req.userId
      if (!currentUserId) {
        return sendError(res, 'Authentication required', 401)
      }

      const { userId: filterUserId, limit, offset } = validation.data
      const admin = isAdminFromToken(req)

      // Build query: admin sees all (or filtered), regular user sees only their own
      const query: Record<string, unknown> = {}

      if (admin) {
        // Admin can filter by userId or see all
        if (filterUserId) {
          query.userId = filterUserId
        }
      } else {
        // Regular user: always scoped to own QR codes
        query.userId = currentUserId
      }

      const [qrCodes, total] = await Promise.all([
        // @ts-expect-error - Mongoose type inference issue with dynamic query
        QRCode.find(query)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .lean()
          .exec() as Promise<Record<string, unknown>[]>,
        QRCode.countDocuments(query),
      ])

      const list = qrCodes.map(qr => ({
        id: String(qr._id),
        userId: qr.userId as string,
        userEmail: qr.userEmail as string | undefined,
        url: qr.url as string,
        title: qr.title as string | undefined,
        redirectType: qr.redirectType as string,
        size: qr.size as number,
        foreground: qr.foreground as string,
        background: qr.background as string,
        errorCorrection: qr.errorCorrection as string,
        includeMargin: qr.includeMargin as boolean,
        scansCount: qr.scansCount as number,
        createdAt: qr.createdAt as string,
        updatedAt: qr.updatedAt as string,
      }))

      return sendSuccess(res, { qrCodes: list }, { total, limit, offset })
    } catch (error) {
      logger.error('[QR Codes] List error:', error)
      return sendError(res, 'Failed to list QR codes')
    }
  },
  {
    summary: 'List QR codes (paginated)',
    tags: ['QR Codes'],
  }
)

export default router
