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
import { isAdminUser } from '../../middleware/auth.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { getApplication } from '../../services/ezauth-client.js'
import { archivePlanInStripe } from '../../services/stripe-plan-sync.js'
import { auditLogService } from '../../services/audit-log.service.js'

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
  success: z.boolean().describe('Whether the request succeeded'),
  data: z
    .object({
      message: z.string().describe('Success message'),
    })
    .describe('Response payload'),
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

const deletePlanHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const paramsValidation = deletePlanParamsSchema.safeParse(req.params)
    if (!paramsValidation.success) {
      return sendValidationError(res, 'Invalid plan ID', paramsValidation.error.errors)
    }

    const { id } = paramsValidation.data

    const Plan = await getPlanModel()
    const plan = await Plan.findById(id)
    if (!plan) {
      return sendError(res, 'Plan not found', 404)
    }

    // Ownership gate — resolve the Application and check the caller.
    const bearerToken = extractBearerToken(req)
    const application = await getApplication(plan.applicationId, { bearerToken })
    if (!application) {
      return sendError(res, 'Application not found', 404)
    }
    if (application.ownerId !== userId && !isAdminUser(req)) {
      return sendError(res, 'Forbidden', 403)
    }

    // Soft-delete first so the DB is always the source of truth.
    plan.active = false
    plan.deletedAt = new Date()
    await plan.save()

    // Fire-and-forget Stripe archival. The helper already swallows its own
    // errors, but wrap in try/catch defensively so any unexpected throw
    // doesn't break the 200 response.
    try {
      await archivePlanInStripe(plan)
    } catch (err) {
      logger.warn('deletePlan: archivePlanInStripe unexpected failure', {
        planId: String(plan._id),
        error: err instanceof Error ? err.message : String(err),
      })
    }

    logger.info(`Plan soft-deleted: ${plan.name} for applicationId=${plan.applicationId}`)

    void auditLogService.createFromRequest(req, {
      action: 'plan.deleted',
      userId,
      metadata: {
        planId: String(plan._id),
        applicationId: plan.applicationId,
        appSlug: application.slug,
        name: plan.name,
      },
    })

    sendSuccess(res, plan)
  } catch (error) {
    logger.error('Delete plan error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to delete plan')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.delete('/plans/:id', authJwtOrKey({ requireKeyScope: 'admin' }), deletePlanHandler, {
  summary: 'Delete a subscription plan (owner or superadmin)',
  tags: ['Plans'],
  responseSchema: deletePlanResponseSchema,
})

export { deletePlanRegistry as registry, router }
export default router
