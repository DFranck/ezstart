/**
 * POST /api/applications — create a new multi-tenant Application.
 *
 * Auth: Bearer (any authenticated user). The created Application is owned by
 * the caller (`ownerId = req.userId`). `createdBy` tracks provenance and is
 * set to the same userId.
 *
 * Slug is globally unique and immutable. Returns 409 on conflict.
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
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { getApplicationModel, APPLICATION_SLUG_REGEX } from '../../models/application.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { serializeApplication } from './serialize.js'
import { logger } from '@ezstart/logger/server'

export const createApplicationRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createApplicationRegistry, router)

/**
 * Reserved slug prefix — only superadmins may create Applications whose slug
 * starts with `_`. This namespace is used for platform-internal apps such as
 * `_docs-demo` (sandbox Application powering /docs/components live previews,
 * see DOCS_DEMO_SANDBOX_BACKEND-001). Tenants must not be able to squat on
 * these names since they would collide with platform-controlled features.
 *
 * Note: the slug regex `^[a-z0-9-]{2,32}$` does NOT allow `_` — only
 * superadmin-created Apps go through a parallel path (seed scripts) that
 * bypass the API route. We still belt-and-suspenders the check here so a
 * future regex relaxation can't accidentally let through tenant-owned
 * `_*` slugs.
 */
const RESERVED_SLUG_PREFIX = '_'

const createApplicationBodySchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(32)
    .regex(
      APPLICATION_SLUG_REGEX,
      'slug must be lowercase letters, digits, or hyphens (2-32 chars)'
    )
    .openapi({ description: 'Stable URL-safe identifier, unique across all Applications' }),
  name: z
    .string()
    .min(1)
    .max(100)
    .trim()
    .openapi({ description: 'Human-readable Application name' }),
  description: z
    .string()
    .max(500)
    .trim()
    .optional()
    .openapi({ description: 'Optional Application description' }),
  metadata: z
    .record(z.unknown())
    .optional()
    .openapi({ description: 'Free-form tenant metadata (plan, features, billing hints, etc.)' }),
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

const createApplicationController = async (req: Request, res: Response) => {
  try {
    const parsed = createApplicationBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request body', parsed.error.issues)
    }

    const userId = req.userId!
    const { slug, name, description, metadata } = parsed.data

    // Reserved namespace — `_*` slugs are platform-internal (e.g. `_docs-demo`
    // sandbox Application). Only superadmins may create them via this route;
    // regular tenants are blocked even if they somehow guess the slug. This
    // prevents tenant squatting on platform-controlled feature names.
    if (slug.startsWith(RESERVED_SLUG_PREFIX)) {
      const isSuperadmin = req.user?.globalRoles?.includes('superadmin') === true
      if (!isSuperadmin) {
        return sendError(
          res,
          'Slugs starting with underscore are reserved for platform internal apps',
          403
        )
      }
    }

    const Application = await getApplicationModel()

    // Explicit uniqueness check to return a clean 409 rather than a raw
    // Mongoose duplicate-key error. `includeArchived: true` opts out of the
    // archive pre-find guard — slug uniqueness is enforced globally by the
    // unique index, so an archived Application still occupies its slug and
    // creating a new one with the same slug would crash with E11000.
    const existing = await Application.findOne({ slug }, null, { includeArchived: true }).lean()
    if (existing) {
      return sendError(res, `Application with slug "${slug}" already exists`, 409)
    }

    const app = await Application.create({
      slug,
      name,
      description,
      metadata,
      ownerId: userId,
      createdBy: userId,
      status: 'active',
    })

    // Append slug to user's apps[] if absent — keeps the post-P5 RBAC surface
    // consistent so the owner automatically sees the new Application in their
    // "My apps" dashboard (pattern used by register flow too).
    //
    // Also seed `appRoles[slug] = ['admin']` so downstream "is admin of this
    // app" checks can rely on the JWT's appRoles map directly, without having
    // to fetch the Application document and compare ownerId.
    const AuthUser = await getAuthUserModel()
    await AuthUser.updateOne(
      { _id: userId },
      {
        $addToSet: { apps: slug },
        $set: { [`appRoles.${slug}`]: ['admin'] },
      }
    )

    return sendSuccess(res, serializeApplication(app))
  } catch (error: unknown) {
    logger.error('Create application error:', error)
    return sendError(res, 'Failed to create application', 500)
  }
}

docRouter.post('/applications', verifyTokenMiddleware, createApplicationController, {
  summary: 'Create a new Application',
  tags: ['Applications'],
  bodySchema: createApplicationBodySchema,
  responseSchema: applicationResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorResponseSchema },
    403: {
      description: 'Reserved slug prefix (only superadmins may create _-prefixed slugs)',
      schema: errorResponseSchema,
    },
    409: { description: 'Slug already in use', schema: errorResponseSchema },
    422: { description: 'Validation error', schema: errorResponseSchema },
  },
})

export default router
