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
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../../utils/api-key.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { logger } from '@ezstart/logger/server'

export const createApiKeyRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createApiKeyRegistry, router)

const createApiKeyBodySchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .trim()
    .openapi({ description: 'Display name for the API key' }),
  appName: z
    .string()
    .optional()
    .default('*')
    .openapi({ description: 'App scope (default: all apps)' }),
  scope: z
    .enum(['app', 'platform'])
    .optional()
    .default('app')
    .openapi({ description: 'Key scope: app (sees only own app) or platform (superadmin, sees all)' }),
  expiresAt: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .openapi({ description: 'Expiry date (ISO 8601) or null for no expiry' }),
})

const createApiKeyResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    key: z.string().openapi({ description: 'Full API key — only returned on creation' }),
    keyPrefix: z.string(),
    name: z.string(),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const MAX_KEYS_PER_USER = 25

const createApiKeyController = async (req: Request, res: Response) => {
  try {
    const parsed = createApiKeyBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request body', parsed.error.issues)
    }

    const userId = req.userId!
    const { scope } = parsed.data

    // Platform-scoped keys require superadmin
    if (scope === 'platform') {
      const AuthUser = await getAuthUserModel()
      const user = await AuthUser.findById(userId).lean()
      if (!user?.globalRoles?.includes('superadmin')) {
        return sendError(res, 'Platform-scoped keys require superadmin role', 403)
      }
    }

    const ApiKey = await getApiKeyModel()

    // Enforce per-user limit
    const activeCount = await ApiKey.countDocuments({ userId, status: 'active' })
    if (activeCount >= MAX_KEYS_PER_USER) {
      return sendError(res, `Maximum ${MAX_KEYS_PER_USER} active API keys allowed`, 400)
    }

    const rawKey = generateRawApiKey(scope)
    const hashedKey = hashApiKey(rawKey)
    const keyPrefix = extractKeyPrefix(rawKey)

    const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null

    // Platform keys always have appName '*'
    const effectiveAppName = scope === 'platform' ? '*' : parsed.data.appName

    const apiKey = await ApiKey.create({
      key: hashedKey,
      keyPrefix,
      name: parsed.data.name,
      userId,
      appName: effectiveAppName,
      scope,
      permissions: ['*'],
      status: 'active',
      expiresAt,
    })

    sendSuccess(res, {
      id: apiKey._id.toString(),
      key: rawKey,
      keyPrefix,
      name: apiKey.name,
    })
  } catch (error: unknown) {
    logger.error('Create API key error:', error)
    sendError(res, 'Failed to create API key', 500)
  }
}

docRouter.post('/keys', verifyTokenMiddleware, createApiKeyController, {
  summary: 'Create a new API key',
  tags: ['API Keys'],
  bodySchema: createApiKeyBodySchema,
  responseSchema: createApiKeyResponseSchema,
  extraResponses: {
    400: { description: 'Validation error or limit reached', schema: errorResponseSchema },
    401: { description: 'Authentication required', schema: errorResponseSchema },
  },
})

export default router
