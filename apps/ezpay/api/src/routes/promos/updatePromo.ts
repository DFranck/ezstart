import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
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
  discountType: z.enum(['percent', 'fixed']).optional(),
  discountValue: z.number().positive().optional(),
  currency: z.string().optional(),
  duration: z.enum(['once', 'repeating', 'forever']).optional(),
  durationInMonths: z.number().int().min(1).optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  active: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

const promoResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
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
    if (updates.discountType === 'percent' && updates.discountValue && updates.discountValue > 100) {
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
