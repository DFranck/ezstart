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
import { getAuthUserModel } from '../../models/auth-user.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { requireAdmin } from './require-admin.js'
import { verifyCookieCsrf } from '../../middleware/csrf.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { adminUserSchema, adminErrorSchema } from '../../types/admin-schemas.js'

export const updateUserRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(updateUserRegistry, router)

// Schemas
const updateUserRequestSchema = z.object({
  // New role structure
  globalRoles: z
    .array(z.enum(['superadmin']))
    .optional()
    .describe('Global roles to assign'),
  appRoles: z
    .record(z.string(), z.array(z.enum(['admin', 'manager', 'beta-tester', 'client'])))
    .optional()
    .describe('Per-app roles mapping'),
  permissions: z.array(z.string()).optional().describe('User permissions'),
  features: z.array(z.string()).optional().describe('Enabled feature flags'),
  apps: z.array(z.string()).optional().describe('Accessible applications'),
  isVerified: z.boolean().optional().describe('Email verification status'),
  organizationId: z.string().optional().describe('Organization ID'),
  managedBy: z.string().optional().describe('Manager user ID'),
})

const updateUserResponseSchema = z.object({
  user: adminUserSchema.describe('Updated user object'),
  message: z.string().describe('Success message'),
})

// Params validation schema
const updateUserParamsSchema = z.object({
  id: z.string().min(1, 'User ID is required').describe('MongoDB ObjectId of the user to update'),
})

// Controller
const updateUserController = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401)
    }

    const parsedParams = updateUserParamsSchema.safeParse(req.params)
    if (!parsedParams.success) {
      return sendValidationError(res, 'Invalid parameters', parsedParams.error.issues)
    }

    const parsedBody = updateUserRequestSchema.safeParse(req.body)
    if (!parsedBody.success) {
      return sendValidationError(res, 'Invalid request body', parsedBody.error.issues)
    }

    const currentUser = req.user
    const isSuperAdmin = currentUser.globalRoles?.includes('superadmin')

    if (!isSuperAdmin) {
      return sendError(res, 'Superadmin access required for user management from ezstart', 403)
    }

    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(parsedParams.data.id)

    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    const body = parsedBody.data

    // Update globalRoles (only superadmin can do this)
    if (body.globalRoles !== undefined) {
      user.globalRoles = body.globalRoles
    }

    // Update appRoles
    if (body.appRoles !== undefined) {
      // Convert plain object to Map
      const appRolesMap = new Map<string, string[]>()
      Object.entries(body.appRoles).forEach(([app, roles]) => {
        appRolesMap.set(app, roles as string[])
      })
      user.appRoles = appRolesMap
    }

    // Update other fields
    const allowedFields = [
      'permissions',
      'features',
      'apps',
      'isVerified',
      'organizationId',
      'managedBy',
    ] as const
    allowedFields.forEach(field => {
      if ((body as Record<string, unknown>)[field] !== undefined) {
        ;(user as unknown as Record<string, unknown>)[field] = (body as Record<string, unknown>)[
          field
        ]
      }
    })

    await user.save()

    // IMPORTANT: use toAuthUser() to avoid leaking passwordHash (previously
    // `...user.toObject()` exposed the bcrypt hash in admin responses).
    sendSuccess(res, {
      user: user.toAuthUser(),
      message: 'User updated successfully',
    })
  } catch (error: unknown) {
    logger.error('Error updating user:', error)
    sendError(res, 'Failed to update user', 500)
  }
}

docRouter.patch(
  '/users/:id',
  verifyCookieCsrf,
  verifyTokenMiddleware,
  requireAdmin,
  updateUserController,
  {
    summary: 'Update user (admin)',
    tags: ['Admin'],
    bodySchema: updateUserRequestSchema,
    responseSchema: updateUserResponseSchema,
    extraResponses: {
      401: { description: 'Unauthorized', schema: adminErrorSchema },
      403: { description: 'Forbidden', schema: adminErrorSchema },
      404: { description: 'User not found', schema: adminErrorSchema },
      500: { description: 'Server error', schema: adminErrorSchema },
    },
  }
)

export default router
