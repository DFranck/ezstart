/**
 * GET /api/applications — list Applications owned by the current user.
 *
 * Auth: Bearer. Superadmins can pass `?all=true` to list all Applications
 * across all owners (platform admin view).
 */

import type { Request, Response } from 'express'
import {
  attachDerivedScope,
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { requireSecretKeyOrJwt } from '../../middleware/require-secret-key-or-jwt.js'
import { getApplicationModel } from '../../models/application.js'
import { serializeApplication } from './serialize.js'
import { logger } from '@ezstart/logger/server'

export const listApplicationsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listApplicationsRegistry, router)

const themeTokenSchema = z.object({
  primary: z.string().optional(),
  background: z.string().optional(),
  foreground: z.string().optional(),
  accent: z.string().optional(),
  logo: z.string().optional(),
})

const applicationItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  ownerId: z.string(),
  metadata: z.record(z.unknown()).nullable().optional(),
  status: z.enum(['active', 'archived']),
  theme: themeTokenSchema.nullable().optional(),
  themeEnabled: z.boolean(),
  isPlatformOwned: z.boolean(),
  requireEmailVerification: z.boolean(),
  webhookEndpointUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const listApplicationsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(applicationItemSchema),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const listApplicationsController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    // Audience scope is server-derived from the JWT (`attachDerivedScope`):
    // - 'all'    → superadmin: every Application across all owners.
    // - 'myApps' → admin: Applications I own.
    // - 'mine'   → regular user: same — Applications I own.
    //
    // Backwards-compat: `?all=true` is preserved for the superadmin platform
    // view but is now redundant (the derived scope already widens to all).
    const derivedScope = req.derivedScope ?? 'mine'
    const legacyAll = req.query.all === 'true'

    if (legacyAll && derivedScope !== 'all') {
      return sendError(res, '`?all=true` requires superadmin', 403)
    }

    // Opt-in to seeing archived (soft-deleted) Applications. By default the
    // model-level pre-find guard hides them from every query; passing
    // `?includeArchived=true` flips the flag for this request only.
    const includeArchived = req.query.includeArchived === 'true'

    const query: Record<string, unknown> = derivedScope === 'all' ? {} : { ownerId: userId }

    // Multi-tenancy: when authenticated via API key restricted to a single
    // Application (`appName !== '*'`), narrow the result set even if the
    // underlying user is a superadmin. Prevents an admin-scoped key for app
    // "acme" from seeing other tenants' Applications. JWT auth leaves
    // `req.apiKeyAppName` undefined → no extra filter applied.
    if (req.apiKeyAppName && req.apiKeyAppName !== '*') {
      query.slug = req.apiKeyAppName
    }

    const Application = await getApplicationModel()
    const findOpts: { includeArchived?: boolean } = includeArchived ? { includeArchived: true } : {}
    const apps = await Application.find(query, null, findOpts).sort({ createdAt: -1 }).lean()

    const data = apps.map(a => serializeApplication(a))

    return sendSuccess(res, data)
  } catch (error: unknown) {
    logger.error('List applications error:', error)
    return sendError(res, 'Failed to list applications', 500)
  }
}

docRouter.get(
  '/applications',
  authJwtOrKey({ requireKeyScope: 'admin' }),
  requireSecretKeyOrJwt,
  attachDerivedScope,
  listApplicationsController,
  {
    summary: 'List Applications (auto-scoped: superadmin = all, others = owned)',
    tags: ['Applications'],
    responseSchema: listApplicationsResponseSchema,
    extraResponses: {
      401: { description: 'Authentication required', schema: errorResponseSchema },
      403: {
        description:
          'Forbidden (`?all=true` requires superadmin), or publishable key rejected (secret S2S key or superadmin JWT required)',
        schema: errorResponseSchema,
      },
    },
  }
)

export default router
