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

export const deletePromoRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(deletePromoRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const deletePromoParamsSchema = z.object({
  id: z.string().min(1).describe('Promo ID'),
})

const deletePromoResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    message: z.string(),
  }),
  error: z.string().optional(),
})

// ========================================
// Route Handler
// ========================================

const deletePromoHandler = async (req: Request, res: Response) => {
  try {
    if (!isAdminUser(req)) {
      return sendError(res, 'Admin access required', 403)
    }

    const paramsValidation = deletePromoParamsSchema.safeParse(req.params)
    if (!paramsValidation.success) {
      return sendValidationError(res, 'Invalid promo ID', paramsValidation.error.errors)
    }

    const { id } = paramsValidation.data

    const Promo = await getPromoModel()

    const promo = await Promo.findByIdAndUpdate(
      id,
      { active: false, deletedAt: new Date() },
      { new: true }
    )

    if (!promo) {
      return sendError(res, 'Promo not found', 404)
    }

    logger.info(`Promo soft-deleted: ${promo.code} for ${promo.appName}`)

    sendSuccess(res, promo)
  } catch (error) {
    logger.error('Delete promo error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to delete promo')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.delete('/promos/:id', authMiddleware, populateUserFromToken, deletePromoHandler, {
  summary: 'Delete a promo code (admin only)',
  tags: ['Promos'],
  responseSchema: deletePromoResponseSchema,
})

export { deletePromoRegistry as registry, router }
export default router
