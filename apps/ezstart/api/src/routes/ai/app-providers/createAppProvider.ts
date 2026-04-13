/**
 * POST /api/ai/app-providers
 * Create a new app provider configuration
 */

import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { z } from 'zod'
import { AppProvider } from '../../../models/AppProvider.js'

const createBodySchema = z
  .object({
    apps: z
      .array(z.string().min(1).max(50))
      .min(1)
      .optional()
      .describe('Apps this provider is scoped to — use ["*"] for all apps'),
    // Legacy single-app field; converted to `apps: [appName]` if `apps` is not provided.
    appName: z.string().min(1).max(50).optional().describe('[Deprecated] Use `apps[]` instead.'),
    providerId: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with dashes')
      .describe('Provider identifier (e.g. gemini-flash)'),
    providerType: z.enum(['gemini', 'openai', 'anthropic']).describe('Provider type'),
    enabled: z.boolean().default(true).describe('Whether provider is enabled'),
    priority: z.number().int().min(1).max(99).default(1).describe('Fallback order (1 = primary)'),
    config: z
      .object({
        model: z.string().max(100).optional(),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().int().min(1).optional(),
      })
      .optional()
      .describe('Provider config overrides'),
  })
  .refine(data => (data.apps && data.apps.length > 0) || Boolean(data.appName), {
    message: 'Either `apps[]` (preferred) or `appName` must be provided',
    path: ['apps'],
  })

export const createAppProviderRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(createAppProviderRegistry, router, '/app-providers')

docRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = createBodySchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Validation error', validation.error.errors)
      }
      const body = validation.data

      // Normalize to `apps[]`: prefer explicit field, fallback to legacy `appName`.
      const apps =
        body.apps && body.apps.length > 0 ? body.apps : body.appName ? [body.appName] : []

      // Check for duplicate on the exact same (providerId, apps[]) tuple.
      const existing = await AppProvider.findOne({
        providerId: body.providerId,
        apps: { $all: apps, $size: apps.length },
      })
        .lean()
        .exec()

      if (existing) {
        return sendError(
          res,
          `Provider "${body.providerId}" already exists for apps [${apps.join(', ')}]`,
          409
        )
      }

      const provider = new AppProvider({
        apps,
        providerId: body.providerId,
        providerType: body.providerType,
        enabled: body.enabled,
        priority: body.priority,
        config: body.config,
      })
      await provider.save()

      sendSuccess(res.status(201), {
        ...provider.toObject(),
        _id: provider._id.toString(),
        createdAt: provider.createdAt?.toISOString(),
        updatedAt: provider.updatedAt?.toISOString(),
      })
    } catch (error: unknown) {
      logger.error('[AI AppProviders] Create error:', error)
      sendError(res, 'Failed to create app provider')
    }
  },
  {
    summary: 'Create a new app provider configuration',
    tags: ['AI App Providers'],
    bodySchema: createBodySchema,
  }
)

export default router
