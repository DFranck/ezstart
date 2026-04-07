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

export const deletePlanRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(deletePlanRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const deletePlanParamsSchema = z.object({
  id: z.string().min(1).describe('Plan ID'),
})

const deletePlanResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    message: z.string(),
  }),
  error: z.string().optional(),
})

// ========================================
// Route Handler
// ========================================

const deletePlanHandler = async (req: Request, res: Response) => {
  try {
    if (!isAdminUser(req)) {
      return sendError(res, 'Admin access required', 403)
    }

    const paramsValidation = deletePlanParamsSchema.safeParse(req.params)
    if (!paramsValidation.success) {
      return sendValidationError(res, 'Invalid plan ID', paramsValidation.error.errors)
    }

    const { id } = paramsValidation.data

    const Plan = await getPlanModel()

    const plan = await Plan.findByIdAndDelete(id)

    if (!plan) {
      return sendError(res, 'Plan not found', 404)
    }

    logger.info(`Plan deleted: ${plan.name} for ${plan.appName}`)

    sendSuccess(res, { message: `Plan ${plan.name} deleted` })
  } catch (error) {
    logger.error('Delete plan error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to delete plan')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.delete('/plans/:id', authMiddleware, populateUserFromToken, deletePlanHandler, {
  summary: 'Delete a subscription plan (admin only)',
  tags: ['Plans'],
  responseSchema: deletePlanResponseSchema,
})

export { deletePlanRegistry as registry, router }
export default router
