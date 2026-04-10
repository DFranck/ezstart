/**
 * POST /api/qr-codes
 * Create a new QR code (auth required)
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

const CreateQRCodeSchema = z.object({
  url: z.string().url().max(2048).describe('Target URL'),
  title: z.string().max(200).optional().describe('Optional label'),
  redirectType: z.enum(['permanent', 'temporary']).default('permanent'),
  size: z.number().int().min(128).max(512).default(256),
  foreground: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#000000'),
  background: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#ffffff'),
  errorCorrection: z.enum(['L', 'M', 'Q', 'H']).default('M'),
  includeMargin: z.boolean().default(true),
  userEmail: z.string().email().optional().describe('User email for admin display'),
})

export const createQRCodeRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const createQRCodeRouter = createRouterWithDoc(createQRCodeRegistry, router, '/qr-codes')

createQRCodeRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = CreateQRCodeSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request', validation.error.errors, 400)
      }

      const userId = req.userId
      if (!userId) {
        return sendError(res, 'Authentication required', 401)
      }

      const data = validation.data

      // @ts-expect-error - Mongoose create() type inference issue
      const qrCode = await QRCode.create({
        userId,
        userEmail: data.userEmail,
        url: data.url,
        title: data.title,
        redirectType: data.redirectType,
        size: data.size,
        foreground: data.foreground,
        background: data.background,
        errorCorrection: data.errorCorrection,
        includeMargin: data.includeMargin,
        scansCount: 0,
      })

      return sendSuccess(res, {
        id: qrCode._id.toString(),
        userId: qrCode.userId,
        userEmail: qrCode.userEmail,
        url: qrCode.url,
        title: qrCode.title,
        redirectType: qrCode.redirectType,
        size: qrCode.size,
        foreground: qrCode.foreground,
        background: qrCode.background,
        errorCorrection: qrCode.errorCorrection,
        includeMargin: qrCode.includeMargin,
        scansCount: qrCode.scansCount ?? 0,
        createdAt: qrCode.createdAt,
        updatedAt: qrCode.updatedAt,
      })
    } catch (error) {
      logger.error('[QR Codes] Create error:', error)
      return sendError(res, 'Failed to create QR code')
    }
  },
  {
    summary: 'Create a new QR code',
    tags: ['QR Codes'],
    bodySchema: CreateQRCodeSchema,
  }
)

export default router
