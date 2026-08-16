/**
 * QR Codes Feature Router
 *
 * All QR code routes require authentication.
 *
 * Routes:
 * - POST   /api/qr-codes          -> createQRCode
 * - GET    /api/qr-codes          -> listQRCodes (paginated)
 * - GET    /api/qr-codes/:id      -> getQRCodeById
 * - DELETE /api/qr-codes/:id      -> deleteQRCode
 */

import { Router, createStrictRateLimiter } from '@ezstart/api-core'
import { authMiddleware } from '../../middleware/auth.js'

import createQRCodeRouter, { createQRCodeRegistry } from './createQRCode.js'
import listQRCodesRouter, { listQRCodesRegistry } from './listQRCodes.js'
import getQRCodeByIdRouter, { getQRCodeByIdRegistry } from './getQRCodeById.js'
import deleteQRCodeRouter, { deleteQRCodeRegistry } from './deleteQRCode.js'

export const qrCodeRegistries = [
  createQRCodeRegistry,
  listQRCodesRegistry,
  getQRCodeByIdRegistry,
  deleteQRCodeRegistry,
]

const router: import('express').Router = Router()

// This parent router is mounted at /api (not /api/qr-codes) — child routers
// carry the '/qr-codes' basePath via createRouterWithDoc. Scope middlewares to
// '/qr-codes' so auth + rate limiter don't leak to other features.
router.use('/qr-codes', authMiddleware)

// Rate limit creation (5 req/min)
router.post('/qr-codes', createStrictRateLimiter())

router
  .use('/', createQRCodeRouter)
  .use('/', listQRCodesRouter)
  .use('/', getQRCodeByIdRouter)
  .use('/', deleteQRCodeRouter)

export default router
