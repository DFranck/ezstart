import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { getPlanModel } from '../../models/Plan.js'
import { authMiddleware, populateUserFromToken, isAdminUser } from '../../middleware/auth.js'
import { getApplication } from '../../services/ezauth-client.js'
import { getStripeInstance } from '../../services/stripe-connect.js'
import { repriceStripePlan, type PlanPriceSnapshot } from '../../services/stripe-plan-sync.js'

export const updatePlanRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(updatePlanRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const updatePlanParamsSchema = z.object({
  id: z.string().min(1).describe('Plan ID'),
})

const planMetadataSchema = z
  .object({
    grantsRoles: z.array(z.string()).optional(),
    grantsFeatures: z.array(z.string()).optional(),
    feePercent: z.number().min(0).max(100).optional(),
    billingGroup: z.string().min(1).max(100).optional(),
    discountVsMonthly: z.number().min(0).max(100).optional(),
  })
  .optional()

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
  trialDays: z
    .number()
    .int()
    .min(0)
    .max(90)
    .nullable()
    .optional()
    .describe('Free-trial duration in days (0-90). 0 / null disables the trial.'),
  metadata: planMetadataSchema.describe(
    'Structured extras (roles, features, feePercent, billingGroup, discountVsMonthly)'
  ),
})

const planResponseSchema = z.object({
  success: z.boolean().describe('Whether the request succeeded'),
  data: z.record(z.unknown()).optional().describe('Response payload (the plan object on success)'),
  error: z.string().optional().describe('Human-readable error message on failure'),
})

// ========================================
// Helpers
// ========================================

function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  const cookieHeader = req.headers.cookie || ''
  return cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('ezauth_token='))
    ?.split('=')[1]
}

// ========================================
// Route Handler
// ========================================

const updatePlanHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      return sendError(res, 'Authentication required', 401)
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
    const plan = await Plan.findById(id)
    if (!plan) {
      return sendError(res, 'Plan not found', 404)
    }

    // Ownership gate — resolve the Plan's Application and check the caller.
    const bearerToken = extractBearerToken(req)
    const application = await getApplication(plan.applicationId, { bearerToken })
    if (!application) {
      return sendError(res, 'Application not found', 404)
    }
    if (application.ownerId !== userId && !isAdminUser(req)) {
      return sendError(res, 'Forbidden', 403)
    }

    // Capture the previous price snapshot BEFORE mutating, so we can detect
    // whether any price-defining field changed and know what the old price
    // looked like if we need to reprice.
    const prevSnapshot: PlanPriceSnapshot = {
      amount: plan.amount,
      currency: plan.currency,
      interval: plan.interval,
      intervalCount: plan.intervalCount,
    }

    // Apply updates to the document (so Stripe sync sees the new values).
    if (updates.name !== undefined) plan.name = updates.name
    if (updates.description !== undefined) plan.description = updates.description ?? undefined
    if (updates.amount !== undefined) plan.amount = updates.amount
    if (updates.currency !== undefined) plan.currency = updates.currency
    if (updates.interval !== undefined) plan.interval = updates.interval
    if (updates.intervalCount !== undefined) plan.intervalCount = updates.intervalCount
    if (updates.features !== undefined) plan.features = updates.features
    if (updates.active !== undefined) plan.active = updates.active
    if (updates.sortOrder !== undefined) plan.sortOrder = updates.sortOrder
    if (updates.trialDays !== undefined) {
      plan.trialDays = updates.trialDays ?? undefined
    }
    if (updates.metadata !== undefined) plan.metadata = updates.metadata

    const priceChanged =
      (updates.amount !== undefined && updates.amount !== prevSnapshot.amount) ||
      (updates.currency !== undefined && updates.currency !== prevSnapshot.currency) ||
      (updates.interval !== undefined && updates.interval !== prevSnapshot.interval) ||
      (updates.intervalCount !== undefined && updates.intervalCount !== prevSnapshot.intervalCount)

    const productMetaChanged = updates.name !== undefined || updates.description !== undefined

    if (priceChanged) {
      try {
        const newPriceId = await repriceStripePlan(plan, prevSnapshot)
        plan.stripePriceId = newPriceId
      } catch (err) {
        logger.error('updatePlan: Stripe reprice failed', err instanceof Error ? err : String(err))
        return sendError(res, 'Stripe sync failed, please retry', 502)
      }
    }

    if (productMetaChanged && plan.stripeProductId) {
      try {
        const stripe = getStripeInstance()
        await stripe.products.update(plan.stripeProductId, {
          name: plan.name,
          description: plan.description,
        })
      } catch (err) {
        logger.warn('updatePlan: Stripe product metadata update failed', {
          planId: String(plan._id),
          productId: plan.stripeProductId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    await plan.save()

    logger.info(`Plan updated: ${plan.name} for applicationId=${plan.applicationId}`)

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
  summary: 'Update a subscription plan (owner or superadmin)',
  tags: ['Plans'],
  bodySchema: updatePlanSchema,
  responseSchema: planResponseSchema,
})

export { updatePlanRegistry as registry, router }
export default router
