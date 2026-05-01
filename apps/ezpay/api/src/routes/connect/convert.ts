/**
 * PATCH /api/connect/accounts/:applicationId — switch an Application's
 * ConnectedAccount between the shared platform Stripe account and a dedicated
 * external Connect account.
 *
 * Auth: Bearer JWT, SUPERADMIN ONLY. Admin-for-app is intentionally not
 * enough — platform ↔ external switchability affects money routing and is
 * therefore restricted to superadmins.
 *
 * Audit: the previous `stripeAccountId`, the actor `userId`, and the
 * transition timestamp are persisted in `ConnectedAccount.metadata` for a
 * full audit trail.
 *
 * @module apps/ezpay/api/src/routes/connect/convert
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { hasRole } from '@ezstart/auth-sdk/rbac/client'
import { getConnectedAccountModel } from '../../models/ConnectedAccount.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { auditLogService } from '../../services/audit-log.service.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const convertConnectRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(convertConnectRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const convertParamsSchema = z.object({
  applicationId: z.string().min(1).describe('Ezauth Application id'),
})

const convertBodySchema = z.object({
  stripeAccountId: z
    .string()
    .min(1)
    .regex(/^acct_[A-Za-z0-9_]+$/, 'stripeAccountId must start with "acct_"')
    .describe('New Stripe account id (must start with acct_)'),
  isPlatformAccount: z
    .boolean()
    .describe('true = platform (shared EZStart LLC) account, false = external Connect account'),
})

const convertResponseSchema = z.object({
  success: z.boolean(),
  data: z.record(z.unknown()).optional(),
  error: z.string().optional(),
})

// ========================================
// Superadmin check
// ========================================

function isSuperadmin(req: Request): boolean {
  const user = req.user as Parameters<typeof hasRole>[0] | undefined
  if (!user) return false
  return hasRole(user, 'superadmin')
}

// ========================================
// Route Handler
// ========================================

const convertHandler = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return sendError(res, 'Authentication required', 401)
    }

    if (!isSuperadmin(req)) {
      return sendError(res, 'Superadmin access required', 403)
    }

    const paramsValidation = convertParamsSchema.safeParse(req.params)
    if (!paramsValidation.success) {
      return sendValidationError(
        res,
        'Invalid applicationId parameter',
        paramsValidation.error.errors
      )
    }

    const bodyValidation = convertBodySchema.safeParse(req.body)
    if (!bodyValidation.success) {
      return sendValidationError(res, 'Invalid convert body', bodyValidation.error.errors)
    }

    const { applicationId } = paramsValidation.data
    const { stripeAccountId, isPlatformAccount } = bodyValidation.data

    const ConnectedAccount = await getConnectedAccountModel()
    const existing = await ConnectedAccount.findOne({ applicationId })
    if (!existing) {
      return sendError(res, 'Connected account not found for this applicationId', 404)
    }

    const previousStripeAccountId = existing.stripeAccountId
    const transitionedAt = new Date()
    const transitionedBy = req.userId

    existing.stripeAccountId = stripeAccountId
    existing.isPlatformAccount = isPlatformAccount
    existing.metadata = {
      previousStripeAccountId,
      transitionedAt,
      transitionedBy,
    }
    await existing.save()

    logger.info('ConnectedAccount converted', {
      applicationId,
      from: previousStripeAccountId,
      to: stripeAccountId,
      isPlatformAccount,
      by: transitionedBy,
    })

    void auditLogService.createFromRequest(req, {
      action: isPlatformAccount ? 'connect.converted_to_platform' : 'connect.converted_to_external',
      userId: transitionedBy,
      metadata: {
        applicationId,
        from: previousStripeAccountId,
        to: stripeAccountId,
        isPlatformAccount,
      },
    })

    sendSuccess(res, { connectedAccount: existing.toObject() })
  } catch (error) {
    logger.error('Connect convert error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to convert connected account')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.patch(
  '/connect/accounts/:applicationId',
  authJwtOrKey({ requireKeyScope: 'admin' }),
  convertHandler,
  {
    summary:
      'Switch a Connected Account between platform (shared) and external Stripe (superadmin only)',
    tags: ['Connect'],
    paramsSchema: convertParamsSchema,
    bodySchema: convertBodySchema,
    responseSchema: convertResponseSchema,
  }
)

export { convertConnectRegistry as registry, router }
export default router
