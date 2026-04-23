/**
 * PATCH /api/applications/:id/theme — update white-label theme tokens.
 *
 * Owner OR superadmin only. Returns 404 (not 403) on tenant mismatch to avoid
 * leaking existence across tenants (same policy as the other application
 * routes).
 *
 * Body shape:
 * ```json
 * {
 *   "theme": {
 *     "primary": "#00D9F7",
 *     "background": "oklch(1 0 0)",
 *     "foreground": "#0f172a",
 *     "accent": "#a855f7",
 *     "logo": "https://cdn.example.com/logo.svg"
 *   },
 *   "themeEnabled": true
 * }
 * ```
 *
 * Both fields are OPTIONAL — callers can toggle the enable flag without
 * touching the tokens, or update the tokens without flipping the toggle.
 * Passing `theme: null` clears the saved tokens entirely.
 *
 * The enable flag itself is NOT gated on billing at this layer — the dashboard
 * UI decides when to surface the toggle. The runtime gate is in
 * `GET /api/keys/config` which only returns the theme when `themeEnabled`
 * is true. This separation keeps the admin UI predictable while letting
 * product decide the activation policy at any time.
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
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { getApplicationModel } from '../../models/application.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { applicationThemeSchema } from '../../utils/theme.js'
import { serializeApplication } from './serialize.js'
import { __resetKeyConfigCache } from '../api-keys/config.js'
import { logger } from '@ezstart/logger/server'

export const updateApplicationThemeRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(updateApplicationThemeRegistry, router)

const updateApplicationThemeBodySchema = z.object({
  theme: applicationThemeSchema.nullable().optional(),
  themeEnabled: z.boolean().optional(),
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
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const updateApplicationThemeController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    if (!id || !Types.ObjectId.isValid(id)) {
      return sendError(res, 'Application not found', 404)
    }

    const parsed = updateApplicationThemeBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request body', parsed.error.issues)
    }

    const { theme, themeEnabled } = parsed.data
    if (theme === undefined && themeEnabled === undefined) {
      return sendValidationError(res, 'Body must contain `theme` or `themeEnabled`', [])
    }

    const Application = await getApplicationModel()
    const app = await Application.findById(id)
    if (!app) {
      return sendError(res, 'Application not found', 404)
    }

    if (app.ownerId !== userId) {
      const AuthUser = await getAuthUserModel()
      const user = await AuthUser.findById(userId).lean()
      const isSuperadmin = user?.globalRoles?.includes('superadmin') ?? false
      if (!isSuperadmin) {
        return sendError(res, 'Application not found', 404)
      }
    }

    if (theme !== undefined) {
      if (theme === null) {
        app.theme = undefined
      } else {
        // Strip undefined entries so empty updates don't explode the doc with
        // noisy absent keys.
        const clean: typeof theme = {}
        if (theme.primary !== undefined) clean.primary = theme.primary
        if (theme.background !== undefined) clean.background = theme.background
        if (theme.foreground !== undefined) clean.foreground = theme.foreground
        if (theme.accent !== undefined) clean.accent = theme.accent
        if (theme.logo !== undefined) clean.logo = theme.logo
        app.theme = Object.keys(clean).length > 0 ? clean : undefined
      }
    }
    if (themeEnabled !== undefined) {
      app.themeEnabled = themeEnabled
    }

    await app.save()

    // Invalidate the /keys/config LRU so the next SSR request sees the new
    // theme without waiting for the 30 s TTL to elapse.
    __resetKeyConfigCache()

    return sendSuccess(res, serializeApplication(app))
  } catch (error: unknown) {
    logger.error('Update application theme error:', error)
    return sendError(res, 'Failed to update application theme', 500)
  }
}

docRouter.patch(
  '/applications/:id/theme',
  verifyTokenMiddleware,
  updateApplicationThemeController,
  {
    summary: 'Update Application white-label theme tokens + enable flag',
    tags: ['Applications'],
    bodySchema: updateApplicationThemeBodySchema,
    responseSchema: applicationResponseSchema,
    extraResponses: {
      401: { description: 'Authentication required', schema: errorResponseSchema },
      404: { description: 'Application not found', schema: errorResponseSchema },
      422: { description: 'Validation error', schema: errorResponseSchema },
    },
  }
)

export default router
