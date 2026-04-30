/**
 * POST /api/applications/:id/regenerate-webhook-secret — rotate the per-Application
 * HMAC webhook secret (Stripe `whsec_*` pattern).
 *
 * Auth: Bearer. Owner OR superadmin only — non-owners receive 404 (not 403)
 * to avoid leaking Application existence across tenants, matching the
 * convention used by the rest of the `/applications/*` surface.
 *
 * Behaviour:
 *   - Generates a fresh `whsec_<64-hex>` and overwrites the previous value
 *     in-place. There is NO grace period — once this endpoint returns, the
 *     OLD secret is dead and any in-flight signature produced with it will
 *     be rejected by the receiver.
 *   - Returns the new secret in the response **once**. The dashboard MUST
 *     surface it to the user immediately (reveal-once UX) — the value is
 *     not retrievable again from any other endpoint.
 *   - Persists an audit log entry (`webhook_secret_regenerated`) with the
 *     userId + Application slug + IP/UA so the rotation is forensically
 *     traceable.
 *   - Body MUST contain `{ confirm: true }` — guards against accidental
 *     clicks (the dashboard layer already wraps this with an AlertDialog
 *     but the API requires explicit confirmation as defense-in-depth).
 *
 * Rate limit: `strict` preset (5 req/min/IP) — even an attacker with a
 * stolen JWT cannot churn the secret faster than the dashboard would
 * reasonably need.
 *
 * @module apps/ezauth/api/src/routes/applications/regenerate-webhook-secret
 */

import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  createStrictRateLimiter,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { Types } from 'mongoose'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { generateWebhookSecret, getApplicationModel } from '../../models/application.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { AuditLogService } from '../../services/audit-log.service.js'
import { serializeApplicationWithSecret } from './serialize.js'
import { logger } from '@ezstart/logger/server'

export const regenerateWebhookSecretRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(regenerateWebhookSecretRegistry, router)

const regenerateBodySchema = z.object({
  /**
   * MUST be `true` — defense-in-depth confirmation that the caller really
   * means to rotate the secret. The dashboard wraps the request with an
   * AlertDialog; this guard catches a misfired curl.
   */
  confirm: z.literal(true).openapi({
    description: 'Must be `true` — explicit confirmation that the rotation is intentional',
  }),
})

const themeTokenSchema = z.object({
  primary: z.string().optional(),
  background: z.string().optional(),
  foreground: z.string().optional(),
  accent: z.string().optional(),
  logo: z.string().optional(),
})

const regenerateResponseSchema = z.object({
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
     * Freshly generated webhook secret in `whsec_<hex>` format. Returned
     * exactly once — the consumer MUST persist or display it immediately.
     */
    webhookSecret: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const regenerateWebhookSecretController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    if (!id || !Types.ObjectId.isValid(id)) {
      return sendError(res, 'Application not found', 404)
    }

    const parsed = regenerateBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request body', parsed.error.issues)
    }

    const Application = await getApplicationModel()
    const app = await Application.findById(id).select('+webhookSecret')
    if (!app) {
      return sendError(res, 'Application not found', 404)
    }

    // Multi-tenancy: an API key restricted to one slug must not be able to
    // rotate the secret of any other Application — even if the underlying
    // user is a superadmin. 404 keeps tenant existence opaque.
    if (req.apiKeyAppName && req.apiKeyAppName !== '*' && app.slug !== req.apiKeyAppName) {
      return sendError(res, 'Application not found', 404)
    }

    if (app.ownerId !== userId) {
      const AuthUser = await getAuthUserModel()
      const user = await AuthUser.findById(userId).lean()
      const isSuperadmin = user?.globalRoles?.includes('superadmin') ?? false
      if (!isSuperadmin) {
        // Deny existence — 404 instead of 403 to avoid tenant-existence leak.
        return sendError(res, 'Application not found', 404)
      }
    }

    const newSecret = generateWebhookSecret()
    app.webhookSecret = newSecret
    await app.save()

    // Fire-and-forget audit log — never blocks the response. The metadata
    // intentionally omits the secret value itself; only the action + actor
    // + Application identity are persisted.
    void AuditLogService.createFromRequest(req, {
      userId,
      action: 'webhook_secret_regenerated',
      metadata: {
        applicationId: String(app._id),
        applicationSlug: app.slug,
      },
    })

    logger.info('[applications] webhook secret regenerated', {
      userId,
      applicationId: String(app._id),
      slug: app.slug,
    })

    return sendSuccess(res, serializeApplicationWithSecret(app))
  } catch (error: unknown) {
    logger.error('Regenerate webhook secret error:', error)
    return sendError(res, 'Failed to regenerate webhook secret', 500)
  }
}

docRouter.post(
  '/applications/:id/regenerate-webhook-secret',
  createStrictRateLimiter(),
  authJwtOrKey({ requireKeyScope: 'admin' }),
  regenerateWebhookSecretController,
  {
    summary: 'Rotate the per-Application HMAC webhook secret (Stripe whsec pattern)',
    tags: ['Applications'],
    bodySchema: regenerateBodySchema,
    responseSchema: regenerateResponseSchema,
    extraResponses: {
      401: { description: 'Authentication required', schema: errorResponseSchema },
      404: { description: 'Application not found', schema: errorResponseSchema },
      422: {
        description: 'Validation error (missing or false `confirm`)',
        schema: errorResponseSchema,
      },
      429: { description: 'Rate limit exceeded', schema: errorResponseSchema },
    },
  }
)

export default router
