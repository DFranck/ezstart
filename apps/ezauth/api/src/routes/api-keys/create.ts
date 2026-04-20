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
  name: z.string().min(1).max(100).trim().openapi({ description: 'Display name for the API key' }),
  appName: z
    .string()
    .optional()
    .default('*')
    .openapi({ description: 'App scope (default: all apps, requires superadmin)' }),
  type: z
    .enum(['publishable', 'secret'])
    .optional()
    .default('publishable')
    .openapi({
      description: 'Key type: publishable (ez_pk_*, client-safe) or secret (ez_sk_*, server-only)',
    }),
  env: z
    .enum(['live', 'test'])
    .optional()
    .default('live')
    .openapi({ description: 'Key environment: live (production) or test (sandbox)' }),
  scope: z
    .enum(['admin', 'user', 'readonly'])
    .optional()
    .default('user')
    .openapi({ description: 'Permission scope metadata (NOT embedded in the key prefix)' }),
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
    type: z.enum(['publishable', 'secret']),
    env: z.enum(['live', 'test']),
    scope: z.enum(['admin', 'user', 'readonly']),
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
    const { type, env, scope, appName } = parsed.data

    // Cross-app keys (appName='*') require superadmin.
    // Note: for a specific appName, any authenticated user can create keys.
    // Ownership / app-admin verification will come with the org/company system later.
    if (appName === '*') {
      const AuthUser = await getAuthUserModel()
      const user = await AuthUser.findById(userId).lean()
      const isSuperadmin = user?.globalRoles?.includes('superadmin') ?? false
      if (!isSuperadmin) {
        return sendError(res, 'Platform-wide keys (appName="*") require superadmin', 403)
      }
    }

    const ApiKey = await getApiKeyModel()

    // Enforce per-user limit
    const activeCount = await ApiKey.countDocuments({ userId, status: 'active' })
    if (activeCount >= MAX_KEYS_PER_USER) {
      return sendError(res, `Maximum ${MAX_KEYS_PER_USER} active API keys allowed`, 400)
    }

    const rawKey = generateRawApiKey({ type, env })
    const hashedKey = hashApiKey(rawKey)
    const keyPrefix = extractKeyPrefix(rawKey)

    const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null

    const apiKey = await ApiKey.create({
      key: hashedKey,
      keyPrefix,
      name: parsed.data.name,
      userId,
      appName,
      type,
      env,
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
      type,
      env,
      scope,
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
    403: {
      description: 'Forbidden (platform-wide key requires superadmin)',
      schema: errorResponseSchema,
    },
  },
})

export default router
