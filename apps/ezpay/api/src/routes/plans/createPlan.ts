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

export const createPlanRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createPlanRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const createPlanSchema = z.object({
  name: z.string().min(1).max(100).describe('Plan name (e.g. Pro, Business)'),
  appName: z.string().min(1).describe('App name (e.g. green-pulse, ezbill)'),
  description: z.string().max(500).optional().describe('Plan description'),
  amount: z.number().int().min(0).describe('Price in cents (e.g. 999 = 9.99)'),
  currency: z.string().min(3).max(3).default('EUR').describe('Currency code'),
  interval: z.enum(['month', 'year']).describe('Billing interval'),
  intervalCount: z.number().int().min(1).max(12).default(1).describe('Number of intervals'),
  features: z.array(z.string()).optional().describe('List of features'),
  sortOrder: z.number().int().min(0).default(0).describe('Display order'),
  stripePriceId: z.string().optional().describe('Pre-created Stripe price ID'),
})

const planResponseSchema = z.object({
  success: z.boolean().describe('Whether the request succeeded'),
  data: z.any().optional().describe('Response payload (the plan object on success)'),
  error: z.string().optional().describe('Human-readable error message on failure'),
})

// ========================================
// Route Handler
// ========================================

const createPlanHandler = async (req: Request, res: Response) => {
  try {
    // Admin check
    if (!isAdminUser(req)) {
      return sendError(res, 'Admin access required', 403)
    }

    const validation = createPlanSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid plan data', validation.error.errors)
    }

    const data = validation.data

    const Plan = await getPlanModel()

    const plan = await Plan.create(data)

    logger.info(`Plan created: ${plan.name} for ${plan.appName}`)

    res.status(201)
    sendSuccess(res, { plan })
  } catch (error) {
    logger.error('Create plan error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to create plan')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post('/plans', authMiddleware, populateUserFromToken, createPlanHandler, {
  summary: 'Create a subscription plan (admin only)',
  tags: ['Plans'],
  bodySchema: createPlanSchema,
  responseSchema: planResponseSchema,
  status: 201,
})

export { createPlanRegistry as registry, router }
export default router
