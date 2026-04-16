import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { getPromoModel } from '../../models/Promo.js'
import { authMiddleware, populateUserFromToken, isAdminUser } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const createPromoRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createPromoRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const createPromoSchema = z.object({
  code: z.string().min(1).max(50).describe('Promo code (auto-uppercased)'),
  appName: z.string().min(1).describe('App name (e.g. green-pulse, ezbill)'),
  discountType: z.enum(['percent', 'fixed']).describe('Discount type'),
  discountValue: z.number().positive().describe('Discount value (20 = 20% or 500 = $5.00)'),
  currency: z.string().optional().describe('Currency code (required for fixed discounts)'),
  duration: z.enum(['once', 'repeating', 'forever']).describe('How long the discount applies'),
  durationInMonths: z.number().int().min(1).optional().describe('Months for repeating duration'),
  maxUses: z.number().int().min(1).optional().describe('Max uses (null = unlimited)'),
  active: z.boolean().default(true).describe('Whether the promo is active'),
  expiresAt: z.string().datetime().optional().describe('Expiration date (ISO 8601)'),
})

const promoResponseSchema = z.object({
  success: z.boolean().describe('Whether the request succeeded'),
  data: z.record(z.unknown()).optional().describe('Response payload (the promo object on success)'),
  error: z.string().optional().describe('Human-readable error message on failure'),
})

// ========================================
// Route Handler
// ========================================

const createPromoHandler = async (req: Request, res: Response) => {
  try {
    // Admin check
    if (!isAdminUser(req)) {
      return sendError(res, 'Admin access required', 403)
    }

    const validation = createPromoSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid promo data', validation.error.errors)
    }

    const data = validation.data

    // Validate: fixed discount requires currency
    if (data.discountType === 'fixed' && !data.currency) {
      return sendError(res, 'Currency is required for fixed discounts', 400)
    }

    // Validate: repeating duration requires durationInMonths
    if (data.duration === 'repeating' && !data.durationInMonths) {
      return sendError(res, 'durationInMonths is required for repeating duration', 400)
    }

    // Validate: percent discount must be between 1 and 100
    if (data.discountType === 'percent' && data.discountValue > 100) {
      return sendError(res, 'Percent discount cannot exceed 100', 400)
    }

    const Promo = await getPromoModel()

    const promo = await Promo.create({
      ...data,
      code: data.code.toUpperCase().trim(),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      usedCount: 0,
    })

    logger.info(`Promo created: ${promo.code} for ${promo.appName}`)

    res.status(201)
    sendSuccess(res, { promo })
  } catch (error) {
    // Handle duplicate key error
    if (error instanceof Error && 'code' in error && (error as { code: number }).code === 11000) {
      return sendError(res, 'A promo with this code already exists for this app', 409)
    }
    logger.error('Create promo error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to create promo')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post('/promos', authMiddleware, populateUserFromToken, createPromoHandler, {
  summary: 'Create a promo code (admin only)',
  tags: ['Promos'],
  bodySchema: createPromoSchema,
  responseSchema: promoResponseSchema,
  status: 201,
})

export { createPromoRegistry as registry, router }
export default router
