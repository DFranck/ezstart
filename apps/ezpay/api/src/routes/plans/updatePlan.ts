import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
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
  name: z.string().min(1).max(100).optional().describe('Plan name (e.g. Pro, Business)'),
  description: z.string().max(500).nullable().optional().describe('Plan description'),
  amount: z.number().int().min(0).optional().describe('Price in cents (e.g. 999 = 9.99)'),
  currency: z.string().min(3).max(3).optional().describe('ISO 4217 currency code'),
  interval: z.enum(['month', 'year']).optional().describe('Billing interval'),
  intervalCount: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .describe('Number of intervals per billing cycle'),
  features: z.array(z.string()).optional().describe('List of features included in the plan'),
  active: z.boolean().optional().describe('Whether the plan is currently active'),
  sortOrder: z.number().int().min(0).optional().describe('Display order for pricing pages'),
  stripePriceId: z.string().nullable().optional().describe('Associated Stripe price ID'),
})

const planResponseSchema = z.object({
  success: z.boolean().describe('Whether the request succeeded'),
  data: z.any().optional().describe('Response payload (the plan object on success)'),
  error: z.string().optional().describe('Human-readable error message on failure'),
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
