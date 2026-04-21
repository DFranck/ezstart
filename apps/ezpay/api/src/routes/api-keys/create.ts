/**
 * POST /api/keys — create a new EZPay API key scoped to an Application.
 *
 * Auth: Bearer JWT. The caller's Bearer token is propagated to ezauth so the
 * Application ownership check runs against the source-of-truth. If ezauth is
 * unreachable or returns non-owner, the request is rejected.
 *
 * @module apps/ezpay/api/src/routes/api-keys/create
 */

import type { Request, Response } from 'express'
import { Router as ExpressRouter } from 'express'
import {
  Router,
  OpenAPIRegistry,
  createRouterWithDoc,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'

import { authMiddleware, populateUserFromToken, isAdminUser } from '../../middleware/auth.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../../utils/api-key.js'
import { getApplication } from '../../services/ezauth-client.js'

export const createApiKeyRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createApiKeyRegistry, router)

const createApiKeyBodySchema = z.object({
  name: z.string().min(1).max(100).trim().openapi({ description: 'Display name for the API key' }),
  applicationId: z.string().min(1).openapi({
    description:
      'Required ezauth Application id — the key will be validated against the ezauth source-of-truth and rejected if the caller is not the owner.',
  }),
  type: z.enum(['publishable', 'secret']).optional().default('publishable').openapi({
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
    applicationId: z.string(),
    appSlug: z.string(),
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

/** Extract the raw JWT the caller sent so we can propagate it to ezauth. */
function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  const cookieHeader = req.headers.cookie || ''
  const cookieToken = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('ezauth_token='))
    ?.split('=')[1]
  return cookieToken
}

const createApiKeyController = async (req: Request, res: Response) => {
  try {
    const parsed = createApiKeyBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request body', parsed.error.issues)
    }

    const userId = req.userId
    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const { name, applicationId, type, env, scope, expiresAt } = parsed.data

    // Cross-service validation — resolve the Application from ezauth and
    // enforce owner / superadmin check. Propagate the caller's Bearer JWT so
    // ezauth can run its ownership logic.
    const bearerToken = extractBearerToken(req)
    const application = await getApplication(applicationId, { bearerToken })

    if (!application) {
      // Matches ezauth behaviour — 404 is returned for both "not found" and
      // "not allowed" to avoid leaking existence across tenants.
      return sendError(res, 'Application not found', 400)
    }

    if (application.status !== 'active') {
      return sendError(res, 'Application is archived', 400)
    }

    // Defensive: ezauth already denies non-owner/non-superadmin with a 404.
    // This extra check covers future API changes and makes the rule explicit.
    if (application.ownerId !== userId && !isAdminUser(req)) {
      return sendError(res, 'Not allowed to create keys for this Application', 403)
    }

    const ApiKey = await getApiKeyModel()
    const activeCount = await ApiKey.countDocuments({ userId, status: 'active' })
    if (activeCount >= MAX_KEYS_PER_USER) {
      return sendError(res, `Maximum ${MAX_KEYS_PER_USER} active API keys allowed`, 400)
    }

    const rawKey = generateRawApiKey({ type, env })
    const hashedKey = hashApiKey(rawKey)
    const keyPrefix = extractKeyPrefix(rawKey)

    const apiKey = await ApiKey.create({
      key: hashedKey,
      keyPrefix,
      name,
      userId,
      applicationId: application.id,
      appSlug: application.slug,
      type,
      env,
      scope,
      permissions: ['*'],
      status: 'active',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: userId,
    })

    sendSuccess(res, {
      id: apiKey._id.toString(),
      key: rawKey,
      keyPrefix,
      name: apiKey.name,
      applicationId: application.id,
      appSlug: application.slug,
      type,
      env,
      scope,
    })
  } catch (error: unknown) {
    logger.error('Create EZPay API key error:', error)
    sendError(res, 'Failed to create API key', 500)
  }
}

docRouter.post('/keys', authMiddleware, populateUserFromToken, createApiKeyController, {
  summary: 'Create a new EZPay API key scoped to an Application',
  tags: ['API Keys'],
  bodySchema: createApiKeyBodySchema,
  responseSchema: createApiKeyResponseSchema,
  extraResponses: {
    400: {
      description: 'Validation error, archived Application, or limit reached',
      schema: errorResponseSchema,
    },
    401: { description: 'Authentication required', schema: errorResponseSchema },
    403: {
      description: 'Not allowed to create keys for this Application',
      schema: errorResponseSchema,
    },
  },
})

export default router
