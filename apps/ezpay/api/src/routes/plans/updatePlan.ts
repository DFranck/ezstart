import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { getPlanModel } from '../../models/Plan.js'
import { authMiddleware, populateUserFromToken, isAdminUser } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const updatePlanRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(updatePlanRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const updatePlanParamsSchema = z.object({
  id: z.string().min(1).describe('Plan ID'),
})

const updatePlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  amount: z.number().int().min(0).optional(),
  currency: z.string().min(3).max(3).optional(),
  interval: z.enum(['month', 'year']).optional(),
  intervalCount: z.number().int().min(1).max(12).optional(),
  features: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  stripePriceId: z.string().nullable().optional(),
})

const planResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
})

// ========================================
// Route Handler
// ========================================

const updatePlanHandler = async (req: Request, res: Response) => {
  try {
    if (!isAdminUser(req)) {
      return sendError(res, 'Admin access required', 403)
    }

    const paramsValidation = updatePlanParamsSchema.safeParse(req.params)
    if (!paramsValidation.success) {
      return sendValidationError(res, 'Invalid plan ID', paramsValidation.error.errors)
    }

    const validation = updatePlanSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid update data', validation.error.errors)
    }

    const { id } = paramsValidation.data
    const updates = validation.data

    const Plan = await getPlanModel()

    const plan = await Plan.findByIdAndUpdate(id, updates, { new: true, runValidators: true })

    if (!plan) {
      return sendError(res, 'Plan not found', 404)
    }

    logger.info(`Plan updated: ${plan.name} for ${plan.appName}`)

    sendSuccess(res, { plan })
  } catch (error) {
    logger.error('Update plan error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to update plan')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.patch('/plans/:id', authMiddleware, populateUserFromToken, updatePlanHandler, {
  summary: 'Update a subscription plan (admin only)',
  tags: ['Plans'],
  bodySchema: updatePlanSchema,
  responseSchema: planResponseSchema,
})

export { updatePlanRegistry as registry, router }
export default router
