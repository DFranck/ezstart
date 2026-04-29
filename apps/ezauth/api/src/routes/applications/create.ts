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

    const Application = await getApplicationModel()

    // Explicit uniqueness check to return a clean 409 rather than a raw
    // Mongoose duplicate-key error.
    const existing = await Application.findOne({ slug }).lean()
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
    409: { description: 'Slug already in use', schema: errorResponseSchema },
    422: { description: 'Validation error', schema: errorResponseSchema },
  },
})

export default router
