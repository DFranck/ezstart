/**
 * GET /api/applications/:id — fetch a single Application by id.
 *
 * Auth: Bearer. Owner OR superadmin. Any other caller receives 404 (not 403)
 * to avoid leaking existence of Applications across tenants.
 *
 * Query params:
 *   - `?include=webhookSecret` — opt-in to receive the per-Application
 *     `whsec_*` HMAC secret in the response. Owner OR superadmin only;
 *     stranger callers still get 404. The S2S sender (ezpay) uses this
 *     view to load the secret before signing outbound webhooks. The
 *     dashboard reveal-once UI uses the dedicated regenerate endpoint
 *     instead, since it always returns a freshly rotated value.
 */

import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { Types } from 'mongoose'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { getApplicationModel } from '../../models/application.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { serializeApplication, serializeApplicationWithSecret } from './serialize.js'
import { logger } from '@ezstart/logger/server'

export const getApplicationRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(getApplicationRegistry, router)

const themeTokenSchema = z.object({
  primary: z.string().optional(),
  background: z.string().optional(),
  foreground: z.string().optional(),
  accent: z.string().optional(),
  logo: z.string().optional(),
})

const applicationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
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
    /**
     * Webhook secret. Only present when the caller passes
     * `?include=webhookSecret` AND is a superadmin or owner. All other
     * callers see this field omitted from the response entirely.
     */
    webhookSecret: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const getApplicationController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    if (!id || !Types.ObjectId.isValid(id)) {
      return sendError(res, 'Application not found', 404)
    }

    // Parse `?include` — comma-separated list. The only currently supported
    // value is `webhookSecret`. Unknown tokens are silently ignored.
    const includeRaw = req.query.include
    const includeTokens =
      typeof includeRaw === 'string'
        ? includeRaw
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        : []
    const includeWebhookSecret = includeTokens.includes('webhookSecret')

    const Application = await getApplicationModel()
    // Conditionally opt-in to the schema's `select: false` `webhookSecret`
    // field. Other reads keep the field hidden by default — the dashboard's
    // generic "fetch this app" call MUST NOT leak the credential.
    const query = Application.findById(id)
    if (includeWebhookSecret) {
      query.select('+webhookSecret')
    }
    const app = await query.lean()
    if (!app) {
      return sendError(res, 'Application not found', 404)
    }

    if (app.ownerId !== userId) {
      const AuthUser = await getAuthUserModel()
      const user = await AuthUser.findById(userId).lean()
      const isSuperadmin = user?.globalRoles?.includes('superadmin') ?? false
      if (!isSuperadmin) {
        // Deny existence — 404 instead of 403 to avoid leaks across tenants.
        return sendError(res, 'Application not found', 404)
      }
    }

    if (includeWebhookSecret) {
      return sendSuccess(res, serializeApplicationWithSecret(app))
    }
    return sendSuccess(res, serializeApplication(app))
  } catch (error: unknown) {
    logger.error('Get application error:', error)
    return sendError(res, 'Failed to fetch application', 500)
  }
}

docRouter.get('/applications/:id', verifyTokenMiddleware, getApplicationController, {
  summary: 'Fetch a single Application',
  tags: ['Applications'],
  responseSchema: applicationResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorResponseSchema },
    404: { description: 'Application not found', schema: errorResponseSchema },
  },
})

export default router
