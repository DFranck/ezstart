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
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { requireSecretKeyOrJwt } from '../../middleware/require-secret-key-or-jwt.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getApiKeyUsageModel } from '../../models/api-key-usage.js'
import { getApplicationModel } from '../../models/application.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { logger } from '@ezstart/logger/server'

export const listApiKeysRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(listApiKeysRegistry, router)

const apiKeyItemSchema = z.object({
  id: z.string(),
  keyPrefix: z.string(),
  name: z.string(),
  appName: z.string(),
  // Scope enum includes legacy 'test'/'live' for backwards compat with pre-P2a keys in DB.
  // New keys only use 'admin'|'user'|'readonly'. Removal deadline: 2026-07-21.
  scope: z.enum(['test', 'live', 'admin', 'user', 'readonly']),
  permissions: z.array(z.string()),
  status: z.enum(['active', 'revoked']),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  revokedAt: z.string().nullable(),
  quotaMonthly: z.number().nullable(),
  usageThisMonth: z.number(),
  applicationId: z.string().nullable(),
  type: z.enum(['publishable', 'secret']).nullable(),
  env: z.enum(['live', 'test']).nullable(),
})

const listApiKeysResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(apiKeyItemSchema),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const listApiKeysController = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const appIdParam =
      typeof req.query.applicationId === 'string' ? req.query.applicationId : undefined

    const ApiKey = await getApiKeyModel()
    const ApiKeyUsage = await getApiKeyUsageModel()

    let baseQuery: Record<string, unknown>

    if (appIdParam) {
      // --- applicationId-scoped listing ---
      if (!Types.ObjectId.isValid(appIdParam)) {
        return sendError(res, 'Invalid applicationId', 400)
      }

      const Application = await getApplicationModel()
      const app = await Application.findById(appIdParam).lean()
      if (!app) {
        return sendError(res, 'Application not found', 404)
      }

      // Access check: owner, superadmin, or app admin.
      // Fast-path : the 'system' sentinel is a trusted platform-internal
      // caller (S2S service key) — admin scope was already validated
      // upstream by the auth middleware. Skip the DB fetch entirely.
      const isOwner = app.ownerId?.toString() === userId
      if (!isOwner && userId !== 'system') {
        // Defensive : non-ObjectId non-'system' userId shouldn't happen
        // after JWT/API-key extraction — deny rather than crash with a
        // Mongoose CastError.
        if (!Types.ObjectId.isValid(userId)) {
          return sendError(res, 'Access denied', 403)
        }
        const AuthUser = await getAuthUserModel()
        const user = await AuthUser.findById(userId).lean()
        const isSuperadmin = user?.globalRoles?.includes('superadmin') ?? false
        const isAppAdmin = user?.appRoles?.[app.slug]?.includes('admin') ?? false
        if (!isSuperadmin && !isAppAdmin) {
          return sendError(res, 'Access denied', 403)
        }
      }

      // Include both keyed-by-applicationId and legacy appName-only keys
      // that predate the P6 multi-tenancy migration.
      baseQuery = {
        $or: [
          { applicationId: new Types.ObjectId(appIdParam) },
          { appName: app.slug, applicationId: { $exists: false } },
        ],
      }
    } else {
      // --- legacy user-scoped listing (unchanged behaviour) ---
      // Multi-tenancy: when authenticated via an API key restricted to a single
      // Application (`appName !== '*'`), narrow the listing so an admin key for
      // 'acme' cannot enumerate keys belonging to the same user but bound to
      // other Applications. JWT auth leaves `req.apiKeyAppName` undefined so
      // the dashboard view is unaffected.
      baseQuery = { userId }
      if (req.apiKeyAppName && req.apiKeyAppName !== '*') {
        baseQuery.appName = req.apiKeyAppName
      }
    }

    const keys = await ApiKey.find(baseQuery).select('-key').sort({ createdAt: -1 }).lean()

    // Get current month usage per key
    const monthPrefix = new Date().toISOString().slice(0, 7)
    const keyIds = keys.map(k => k._id.toString())
    const usageAgg = await ApiKeyUsage.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          apiKeyId: { $in: keyIds },
          date: { $regex: `^${monthPrefix}` },
        },
      },
      {
        $group: {
          _id: '$apiKeyId',
          total: { $sum: '$requestCount' },
        },
      },
    ])
    const usageMap = new Map(usageAgg.map(u => [u._id, u.total]))

    const data = keys.map(k => ({
      id: k._id.toString(),
      keyPrefix: k.keyPrefix,
      name: k.name,
      appName: k.appName,
      scope: k.scope || 'live',
      permissions: k.permissions,
      status: k.status,
      lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
      expiresAt: k.expiresAt ? k.expiresAt.toISOString() : null,
      createdAt: k.createdAt.toISOString(),
      revokedAt: k.revokedAt ? k.revokedAt.toISOString() : null,
      quotaMonthly: k.quotaMonthly ?? null,
      usageThisMonth: usageMap.get(k._id.toString()) ?? 0,
      applicationId: k.applicationId?.toString() ?? null,
      type: k.type ?? null,
      env: k.env ?? null,
    }))

    sendSuccess(res, data)
  } catch (error: unknown) {
    logger.error('List API keys error:', error)
    sendError(res, 'Failed to list API keys', 500)
  }
}

docRouter.get(
  '/keys',
  authJwtOrKey({ requireKeyScope: 'admin' }),
  requireSecretKeyOrJwt,
  listApiKeysController,
  {
    summary: 'List API keys for current user',
    tags: ['API Keys'],
    responseSchema: listApiKeysResponseSchema,
    extraResponses: {
      401: { description: 'Authentication required', schema: errorResponseSchema },
      403: {
        description:
          'Access denied, or publishable key rejected (secret S2S key or superadmin JWT required)',
        schema: errorResponseSchema,
      },
      404: { description: 'Application not found', schema: errorResponseSchema },
    },
  }
)

export default router
