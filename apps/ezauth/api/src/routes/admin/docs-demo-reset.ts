/**
 * POST /api/admin/docs-demo/reset — manual trigger of the docs-demo data
 * wipe (DOCS_DEMO_SANDBOX_BACKEND-001).
 *
 * Auth: Bearer JWT or admin API key, MUST be a superadmin (the cron runs
 * automatically every 24h — this endpoint is purely an escape hatch for
 * incident response or pre-demo cleanup).
 *
 * The handler delegates to `resetDocsDemoData()` and audit-logs the action
 * so we have a forensic trail of who manually wiped the sandbox and when.
 */

import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendError,
  sendSuccess,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { requireAdmin } from './require-admin.js'
import { resetDocsDemoData } from '../../services/docs-demo-reset.service.js'
import { AuditLogService } from '../../services/audit-log.service.js'
import { adminErrorSchema } from '../../types/admin-schemas.js'

export const docsDemoResetRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(docsDemoResetRegistry, router)

const docsDemoResetResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    durationMs: z.number().int().nonnegative(),
    usersDeleted: z.number().int().nonnegative(),
    refreshTokensDeleted: z.number().int().nonnegative(),
    auditLogsDeleted: z.number().int().nonnegative(),
  }),
})

const docsDemoResetController = async (req: Request, res: Response) => {
  // Defence-in-depth: the route is mounted behind `requireAdmin`, but we
  // additionally short-circuit non-superadmins here so a future RBAC drift
  // (e.g. someone narrowing requireAdmin to per-app admin) never lets a
  // tenant nuke the sandbox.
  const isSuperadmin = req.user?.globalRoles?.includes('superadmin') === true
  if (!isSuperadmin) {
    return sendError(res, 'Superadmin role required for docs-demo reset', 403)
  }

  try {
    const result = await resetDocsDemoData()

    // Fire-and-forget audit log — capture who manually wiped the sandbox.
    // Use the `session_revoked` action enum (closest existing semantics:
    // "data was forcibly cleared by an admin"); a dedicated action would
    // require an audit_log enum migration which is overkill for a sandbox
    // operation. The metadata clearly identifies the docs-demo scope.
    void AuditLogService.createFromRequest(req, {
      userId: req.userId ?? 'unknown',
      action: 'session_revoked',
      appName: '_docs-demo',
      metadata: {
        reason: 'docs-demo manual reset',
        usersDeleted: result.usersDeleted,
        refreshTokensDeleted: result.refreshTokensDeleted,
        auditLogsDeleted: result.auditLogsDeleted,
        durationMs: result.durationMs,
      },
    })

    return sendSuccess(res, result)
  } catch (error: unknown) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      'Docs demo manual reset failed'
    )
    return sendError(res, 'Failed to reset docs-demo data', 500)
  }
}

docRouter.post(
  '/docs-demo/reset',
  authJwtOrKey({ requireKeyScope: 'admin' }),
  requireAdmin,
  docsDemoResetController,
  {
    summary: 'Manually reset the docs-demo sandbox dataset (superadmin only)',
    tags: ['Admin'],
    responseSchema: docsDemoResetResponseSchema,
    extraResponses: {
      401: { description: 'Unauthorized', schema: adminErrorSchema },
      403: { description: 'Superadmin role required', schema: adminErrorSchema },
      500: { description: 'Reset failed', schema: adminErrorSchema },
    },
  }
)

export default router
