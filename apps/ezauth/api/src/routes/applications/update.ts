/**
 * PATCH /api/applications/:id — update name / description / metadata.
 *
 * `slug` is immutable. Owner OR superadmin only. Denies with 404 to avoid
 * tenant existence leaks.
 */

import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
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
import { requireEmailVerified } from '../../middleware/require-email-verified.js'
import { getApplicationModel } from '../../models/application.js'
import { isSuperadmin } from '../../utils/is-superadmin.js'
import { serializeApplication } from './serialize.js'
import { logger } from '@ezstart/logger/server'

export const updateApplicationRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(updateApplicationRegistry, router)

const updateApplicationBodySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).trim().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  /**
   * Composable email-verification gate (Clerk / Vercel pattern). When `true`,
   * the consumer signals that downstream features should require a verified
   * email. Login itself is never blocked. Default `false`.
   */
  requireEmailVerification: z.boolean().optional(),
})

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
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const updateApplicationController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    if (!id || !Types.ObjectId.isValid(id)) {
      return sendError(res, 'Application not found', 404)
    }

    const parsed = updateApplicationBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request body', parsed.error.issues)
    }

    const Application = await getApplicationModel()
    const app = await Application.findById(id)
    if (!app) {
      return sendError(res, 'Application not found', 404)
    }

    // Multi-tenancy: see the same comment in routes/applications/get.ts —
    // an API key bound to slug 'acme' must not be able to mutate any other
    // Application even when the underlying user is a superadmin.
    if (req.apiKeyAppName && req.apiKeyAppName !== '*' && app.slug !== req.apiKeyAppName) {
      return sendError(res, 'Application not found', 404)
    }

    if (app.ownerId !== userId && !(await isSuperadmin(userId))) {
      return sendError(res, 'Application not found', 404)
    }

    const { name, description, metadata, requireEmailVerification } = parsed.data
    if (name !== undefined) app.name = name
    if (description !== undefined) {
      app.description = description ?? undefined
    }
    if (metadata !== undefined) {
      app.metadata = metadata ?? undefined
    }
    if (requireEmailVerification !== undefined) {
      app.requireEmailVerification = requireEmailVerification
    }

    await app.save()

    return sendSuccess(res, serializeApplication(app))
  } catch (error: unknown) {
    logger.error('Update application error:', error)
    return sendError(res, 'Failed to update application', 500)
  }
}

docRouter.patch(
  '/applications/:id',
  authJwtOrKey({ requireKeyScope: 'admin' }),
  // HAC-HIGH-2 (2026-05-17) — mutating Application metadata (including the
  // `requireEmailVerification` policy flag) is owner-privileged; require
  // the owner's own email to be verified first.
  requireEmailVerified,
  updateApplicationController,
  {
    summary: 'Update Application name / description / metadata (slug is immutable)',
    tags: ['Applications'],
    bodySchema: updateApplicationBodySchema,
    responseSchema: applicationResponseSchema,
    extraResponses: {
      401: { description: 'Authentication required', schema: errorResponseSchema },
      403: {
        description: 'Email not verified — `code: EMAIL_VERIFICATION_REQUIRED`',
        schema: errorResponseSchema,
      },
      404: { description: 'Application not found', schema: errorResponseSchema },
      422: { description: 'Validation error', schema: errorResponseSchema },
    },
  }
)

export default router
