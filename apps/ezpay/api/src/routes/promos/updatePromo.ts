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

export const updatePromoRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(updatePromoRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const updatePromoParamsSchema = z.object({
  id: z.string().min(1).describe('Promo ID'),
})

const updatePromoSchema = z.object({
  discountType: z
    .enum(['percent', 'fixed'])
    .optional()
    .describe('Discount type (percent or fixed amount)'),
  discountValue: z
    .number()
    .positive()
    .optional()
    .describe('Discount value (e.g. 20 for 20% or 500 for $5.00)'),
  currency: z.string().optional().describe('ISO 4217 currency code (required for fixed discounts)'),
  duration: z
    .enum(['once', 'repeating', 'forever'])
    .optional()
    .describe('How long the discount applies'),
  durationInMonths: z.number().int().min(1).optional().describe('Months for repeating duration'),
  maxUses: z
    .number()
    .int()
    .min(1)
    .nullable()
    .optional()
    .describe('Maximum uses (null = unlimited)'),
  active: z.boolean().optional().describe('Whether the promo is active'),
  expiresAt: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .describe('Expiration date (ISO 8601, null = never)'),
})

const promoResponseSchema = z.object({
  success: z.boolean().describe('Whether the request succeeded'),
  data: z.record(z.unknown()).optional().describe('Response payload (the promo object on success)'),
  error: z.string().optional().describe('Human-readable error message on failure'),
})

// ========================================
// Route Handler
// ========================================

const updatePromoHandler = async (req: Request, res: Response) => {
  try {
    if (!isAdminUser(req)) {
      return sendError(res, 'Admin access required', 403)
    }

    const paramsValidation = updatePromoParamsSchema.safeParse(req.params)
    if (!paramsValidation.success) {
      return sendValidationError(res, 'Invalid promo ID', paramsValidation.error.errors)
    }

    const validation = updatePromoSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid update data', validation.error.errors)
    }

    const { id } = paramsValidation.data
    const updates = validation.data

    // Validate: percent discount must be between 1 and 100
    if (
      updates.discountType === 'percent' &&
      updates.discountValue &&
      updates.discountValue > 100
    ) {
      return sendError(res, 'Percent discount cannot exceed 100', 400)
    }

    // Convert expiresAt string to Date
    const updateData: Record<string, unknown> = { ...updates }
    if (updates.expiresAt !== undefined) {
      updateData.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null
    }

    const Promo = await getPromoModel()

    const promo = await Promo.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })

    if (!promo) {
      return sendError(res, 'Promo not found', 404)
    }

    logger.info(`Promo updated: ${promo.code} for ${promo.appName}`)

    sendSuccess(res, { promo })
  } catch (error) {
    logger.error('Update promo error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to update promo')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.patch('/promos/:id', authMiddleware, populateUserFromToken, updatePromoHandler, {
  summary: 'Update a promo code (admin only)',
  tags: ['Promos'],
  bodySchema: updatePromoSchema,
  responseSchema: promoResponseSchema,
})

export { updatePromoRegistry as registry, router }
export default router
