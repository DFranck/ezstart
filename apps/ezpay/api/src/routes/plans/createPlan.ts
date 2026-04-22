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
import { syncPlanToStripe } from '../../services/stripe-plan-sync.js'

export const createPlanRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createPlanRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const planMetadataSchema = z
  .object({
    grantsRoles: z.array(z.string()).optional(),
    grantsFeatures: z.array(z.string()).optional(),
    feePercent: z.number().min(0).max(100).optional(),
    billingGroup: z.string().min(1).max(100).optional(),
    discountVsMonthly: z.number().min(0).max(100).optional(),
  })
  .optional()

const createPlanSchema = z.object({
  name: z.string().min(1).max(100).describe('Plan name (e.g. Pro, Business)'),
  applicationId: z
    .string()
    .min(1)
    .describe('ezauth Application id — validated against the source of truth'),
  description: z.string().max(500).optional().describe('Plan description'),
  amount: z.number().int().min(0).describe('Price in cents (e.g. 999 = 9.99)'),
  currency: z.string().min(3).max(3).default('EUR').describe('Currency code'),
  interval: z.enum(['month', 'year']).describe('Billing interval'),
  intervalCount: z.number().int().min(1).max(12).default(1).describe('Number of intervals'),
  features: z.array(z.string()).optional().describe('List of features'),
  sortOrder: z.number().int().min(0).default(0).describe('Display order'),
  trialDays: z
    .number()
    .int()
    .min(0)
    .max(90)
    .optional()
    .describe('Free-trial duration in days (0-90). 0 / omitted disables the trial.'),
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

const createPlanHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const validation = createPlanSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid plan data', validation.error.errors)
    }

    const data = validation.data

    // Ownership gate: resolve the Application from ezauth source-of-truth
    // and enforce owner/superadmin access. The caller's Bearer is forwarded
    // so ezauth's JWT-based ownership check runs.
    const bearerToken = extractBearerToken(req)
    const application = await getApplication(data.applicationId, { bearerToken })
    if (!application) {
      return sendError(res, 'Application not found', 404)
    }
    if (application.status !== 'active') {
      return sendError(res, 'Application is archived', 400)
    }
    if (application.ownerId !== userId && !isAdminUser(req)) {
      return sendError(res, 'Forbidden', 403)
    }

    const Plan = await getPlanModel()

    // Create the Plan row first so we have a stable `_id` for Stripe
    // idempotency keys. If the Stripe sync fails, we roll back the DB row.
    const plan = await Plan.create({
      ...data,
      appName: application.slug,
    })

    let stripeIds: { stripeProductId: string; stripePriceId: string }
    try {
      stripeIds = await syncPlanToStripe(plan)
    } catch (err) {
      logger.error(
        'createPlan: Stripe sync failed, rolling back',
        err instanceof Error ? err : String(err)
      )
      await plan.deleteOne()
      return sendError(res, 'Stripe sync failed, please retry', 502)
    }

    plan.stripeProductId = stripeIds.stripeProductId
    plan.stripePriceId = stripeIds.stripePriceId
    await plan.save()

    logger.info(`Plan created: ${plan.name} for applicationId=${plan.applicationId}`)

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
  summary: 'Create a subscription plan (owner or superadmin)',
  tags: ['Plans'],
  bodySchema: createPlanSchema,
  responseSchema: planResponseSchema,
  status: 201,
})

export { createPlanRegistry as registry, router }
export default router
