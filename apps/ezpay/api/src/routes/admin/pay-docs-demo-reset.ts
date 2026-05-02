/**
 * POST /api/admin/pay-docs-demo/reset — manual trigger of the pay-docs-demo
 * data wipe + re-seed (PAY_DOCS_DEMO_SANDBOX-001 = #178, mirror of #163).
 *
 * Auth: Bearer JWT or admin API key, MUST be a superadmin (the cron runs
 * automatically every 24h — this endpoint is purely an escape hatch for
 * incident response or pre-demo cleanup).
 *
 * The handler delegates to `resetPayDocsDemoData()` and audit-logs the
 * action so we have a forensic trail of who manually wiped the sandbox
 * and when.
 */

import type { Request, Response, Router as ExpressRouter } from 'express'
import {
  createRoleMiddleware,
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendError,
  sendSuccess,
} from '@ezstart/api-core'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { resetPayDocsDemoData } from '../../services/pay-docs-demo-reset.service.js'
import { auditLogService } from '../../services/audit-log.service.js'

export const payDocsDemoResetRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(payDocsDemoResetRegistry, router)
const { requireAdmin } = createRoleMiddleware()

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const payDocsDemoResetResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    durationMs: z.number().int().nonnegative(),
    paymentsDeleted: z.number().int().nonnegative(),
    reseed: z.object({
      plansCreated: z.number().int().nonnegative(),
      plansAlreadyExisted: z.number().int().nonnegative(),
      subscriptionsCreated: z.number().int().nonnegative(),
      paymentsCreated: z.number().int().nonnegative(),
      donationsCreated: z.number().int().nonnegative(),
      invoicesCreated: z.number().int().nonnegative(),
    }),
  }),
})

const payDocsDemoResetController = async (req: Request, res: Response) => {
  // Defence-in-depth: route is mounted behind `requireAdmin`, but we
  // additionally short-circuit non-superadmins here so a future RBAC drift
  // (e.g. someone narrowing requireAdmin to per-app admin) never lets a
  // tenant nuke the sandbox.
  const isSuperadmin = req.user?.globalRoles?.includes('superadmin') === true
  if (!isSuperadmin) {
    return sendError(res, 'Superadmin role required for pay-docs-demo reset', 403)
  }

  try {
    const result = await resetPayDocsDemoData()

    // Fire-and-forget audit log — capture who manually wiped the sandbox.
    // Reuse the existing `payments.cleanup` action enum which best matches
    // the semantics ("a batch of payment-shaped docs was admin-cleared").
    // The metadata clearly identifies the pay-docs-demo scope.
    void auditLogService.createFromRequest(req, {
      userId: req.userId ?? 'unknown',
      action: 'payments.cleanup',
      appName: '_pay-docs-demo',
      metadata: {
        reason: 'pay-docs-demo manual reset',
        paymentsDeleted: result.paymentsDeleted,
        durationMs: result.durationMs,
        reseedSubscriptions: result.reseed.subscriptionsCreated,
        reseedPayments: result.reseed.paymentsCreated,
        reseedDonations: result.reseed.donationsCreated,
        reseedInvoices: result.reseed.invoicesCreated,
      },
    })

    return sendSuccess(res, result)
  } catch (error: unknown) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      'Pay docs demo manual reset failed'
    )
    return sendError(res, 'Failed to reset pay-docs-demo data', 500)
  }
}

docRouter.post(
  '/admin/pay-docs-demo/reset',
  authJwtOrKey({ requireKeyScope: 'admin' }),
  requireAdmin,
  payDocsDemoResetController,
  {
    summary: 'Manually reset the pay-docs-demo sandbox dataset (superadmin only)',
    tags: ['Admin'],
    responseSchema: payDocsDemoResetResponseSchema,
    extraResponses: {
      401: { description: 'Unauthorized', schema: errorResponseSchema },
      403: { description: 'Superadmin role required', schema: errorResponseSchema },
      500: { description: 'Reset failed', schema: errorResponseSchema },
    },
  }
)

export { payDocsDemoResetRegistry as registry, router }
export default router
