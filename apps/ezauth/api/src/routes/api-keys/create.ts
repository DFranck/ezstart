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
import { getApiKeyModel } from '../../models/api-key.js'
import { getApplicationModel, APPLICATION_SLUG_REGEX } from '../../models/application.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../../utils/api-key.js'
import { isSuperadmin } from '../../utils/is-superadmin.js'
import { AuditLogService } from '../../services/audit-log.service.js'
import { logger } from '@ezstart/logger/server'

export const createApiKeyRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createApiKeyRegistry, router)

const createApiKeyBodySchema = z.object({
  name: z.string().min(1).max(100).trim().openapi({ description: 'Display name for the API key' }),
  applicationId: z.string().optional().openapi({
    description:
      'Multi-tenant Application id this key belongs to. Required for app-scoped keys (P6+). Legacy `appName` accepted with warn until 2026-07-21.',
  }),
  appName: z
    .string()
    .min(1)
    .max(32)
    .refine(v => v === '*' || APPLICATION_SLUG_REGEX.test(v), {
      message:
        'Invalid appName format — must match /^[a-z0-9-]{2,32}$/ or be "*" for superadmin platform-wide keys',
    })
    .optional()
    .openapi({
      description:
        'DEPRECATED legacy app scope field — use `applicationId` instead. Still accepted for backwards compat until 2026-07-21. Must match /^[a-z0-9-]{2,32}$/. `"*"` still valid for superadmin platform-wide keys.',
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
    appName: z.string(),
    applicationId: z.string().nullable(),
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
    const { type, env, scope, applicationId, appName: legacyAppName } = parsed.data

    // `isSuperadmin` helper handles the 'system' sentinel (S2S service key)
    // + defensively guards against non-ObjectId userIds (returns false without
    // hitting Mongoose with a CastError).
    const isSuperadminUser = await isSuperadmin(userId)

    // Resolve the Application for this key.
    // Precedence: explicit `applicationId` > legacy `appName` find-or-create > `'*'` (superadmin).
    let resolvedApplicationId: Types.ObjectId | null = null
    let resolvedAppName: string = '*'

    const Application = await getApplicationModel()

    if (applicationId) {
      if (!Types.ObjectId.isValid(applicationId)) {
        return sendError(res, 'Invalid applicationId', 400)
      }
      // `includeArchived: true` opts out of the Application archive guard so
      // we can return a precise "Application is archived" 400 below instead
      // of collapsing the branch into a generic 404 when the app exists but
      // has been soft-deleted.
      const app = await Application.findOne({ _id: applicationId }, null, {
        includeArchived: true,
      }).lean()
      if (!app) {
        return sendError(res, 'Application not found', 404)
      }
      if (app.status !== 'active') {
        return sendError(res, 'Application is archived', 400)
      }
      if (app.ownerId !== userId && !isSuperadminUser) {
        return sendError(res, 'Not allowed to create keys for this Application', 403)
      }
      resolvedApplicationId = app._id as Types.ObjectId
      resolvedAppName = app.slug
    } else if (legacyAppName && legacyAppName !== '*') {
      // Defense-in-depth: Zod already validates the slug format, but we
      // re-check here so the find-or-create path can never hit Mongoose with
      // an invalid slug (which would surface as a 500 instead of a clean 400).
      if (!APPLICATION_SLUG_REGEX.test(legacyAppName)) {
        return sendValidationError(res, 'Invalid appName format — must match /^[a-z0-9-]{2,32}$/', [
          {
            code: 'custom',
            path: ['appName'],
            message: 'Invalid appName format — must match /^[a-z0-9-]{2,32}$/',
          },
        ])
      }

      logger.warn('Legacy appName field used, migrate to applicationId by 2026-07-21', {
        userId,
        appName: legacyAppName,
      })

      // Find-or-create path — mirrors migration logic so a key can be created
      // with a slug before the owner explicitly provisions the Application.
      const existingApp = await Application.findOne({ slug: legacyAppName }).lean()
      if (existingApp) {
        if (existingApp.ownerId !== userId && !isSuperadminUser) {
          return sendError(res, 'Not allowed to create keys for this Application', 403)
        }
        resolvedApplicationId = existingApp._id as Types.ObjectId
        resolvedAppName = existingApp.slug
      } else {
        const created = await Application.create({
          slug: legacyAppName,
          name: legacyAppName,
          ownerId: userId,
          createdBy: userId,
          status: 'active',
        })
        resolvedApplicationId = created._id as Types.ObjectId
        resolvedAppName = created.slug
      }
    } else {
      // Platform-wide `'*'` case — superadmin only. No Application link.
      if (!isSuperadminUser) {
        return sendError(
          res,
          'Platform-wide keys (appName="*") require superadmin. Pass `applicationId` instead.',
          403
        )
      }
      resolvedApplicationId = null
      resolvedAppName = '*'
    }

    // Multi-tenancy: when authenticated via an API key bound to a single
    // Application slug, deny creation of a key for any other slug — even
    // when the underlying user is a superadmin. Prevents an admin-scoped
    // key for 'acme' from being used to mint keys for other tenants.
    if (req.apiKeyAppName && req.apiKeyAppName !== '*' && resolvedAppName !== req.apiKeyAppName) {
      return sendError(
        res,
        `API key restricted to '${req.apiKeyAppName}' cannot create keys for another Application`,
        403
      )
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
      appName: resolvedAppName,
      applicationId: resolvedApplicationId ?? undefined,
      type,
      env,
      scope,
      permissions: ['*'],
      status: 'active',
      expiresAt,
    })

    void AuditLogService.createFromRequest(req, {
      userId,
      action: 'api_key_created',
      appName: resolvedAppName,
      metadata: {
        apiKeyId: apiKey._id.toString(),
        keyPrefix,
        type,
        env,
        scope,
      },
    })

    sendSuccess(res, {
      id: apiKey._id.toString(),
      key: rawKey,
      keyPrefix,
      name: apiKey.name,
      appName: resolvedAppName,
      applicationId: resolvedApplicationId?.toString() ?? null,
      type,
      env,
      scope,
    })
  } catch (error: unknown) {
    logger.error('Create API key error:', error)
    sendError(res, 'Failed to create API key', 500)
  }
}

docRouter.post(
  '/keys',
  authJwtOrKey({ requireKeyScope: 'admin' }),
  // HAC-HIGH-2 (2026-05-17) — gate API key creation behind email verification.
  // An unverified account must not be able to mint keys that grant access to
  // paid features (cf. `standard-saas-security.md` §2 "email verification gate").
  requireEmailVerified,
  createApiKeyController,
  {
    summary: 'Create a new API key',
    tags: ['API Keys'],
    bodySchema: createApiKeyBodySchema,
    responseSchema: createApiKeyResponseSchema,
    extraResponses: {
      400: { description: 'Validation error or limit reached', schema: errorResponseSchema },
      401: { description: 'Authentication required', schema: errorResponseSchema },
      403: {
        description:
          'Forbidden (platform-wide, non-owned Application, or email not verified — `code: EMAIL_VERIFICATION_REQUIRED`)',
        schema: errorResponseSchema,
      },
      404: { description: 'Application not found', schema: errorResponseSchema },
    },
  }
)

export default router
