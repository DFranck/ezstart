import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getAuthUserModel } from '../../models/auth-user.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { mapToRecord } from '../../utils/map-to-record.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'

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
  // Legacy fields
  roles: z
    .array(z.enum(['superadmin', 'admin', 'manager', 'beta-tester', 'client']))
    .optional()
    .describe('Legacy roles array'),
  permissions: z.array(z.string()).optional().describe('User permissions'),
  features: z.array(z.string()).optional().describe('Enabled feature flags'),
  apps: z.array(z.string()).optional().describe('Accessible applications'),
  isVerified: z.boolean().optional().describe('Email verification status'),
  organizationId: z.string().optional().describe('Organization ID'),
  managedBy: z.string().optional().describe('Manager user ID'),
})

const userSchema = z.object({
  _id: z.string().describe('User unique identifier'),
  email: z.string().describe('User email address'),
  username: z.string().optional().describe('Username'),
  globalRoles: z.array(z.string()).optional().describe('Global roles'),
  appRoles: z.record(z.string(), z.array(z.string())).optional().describe('Per-app roles mapping'),
  roles: z.array(z.string()).describe('User roles'),
  permissions: z.array(z.string()).describe('User permissions'),
  features: z.array(z.string()).describe('Enabled feature flags'),
  apps: z.array(z.string()).optional().describe('Accessible applications'),
  isVerified: z.boolean().optional().describe('Email verification status'),
  organizationId: z.string().optional().describe('Organization ID'),
  managedBy: z.string().optional().describe('Manager user ID'),
  createdAt: z.string().describe('Creation date ISO string'),
  updatedAt: z.string().describe('Last update date ISO string'),
})

const updateUserResponseSchema = z.object({
  user: userSchema.describe('Updated user object'),
  message: z.string().describe('Success message'),
})

const errorSchema = z.object({
  error: z.string().describe('Error message'),
  details: z.string().optional().describe('Additional error details'),
})

// Params validation schema
const updateUserParamsSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
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

    sendSuccess(res, {
      user: {
        ...user.toObject(),
        _id: String(user._id),
        globalRoles: user.globalRoles || [],
        appRoles: mapToRecord(user.appRoles),
        permissions: user.permissions || [],
        features: user.features || [],
        isVerified: user.isVerified,
      },
      message: 'User updated successfully',
    })
  } catch (error: unknown) {
    logger.error('Error updating user:', error)
    sendError(res, 'Failed to update user', 500)
  }
}

docRouter.patch('/users/:id', verifyTokenMiddleware, updateUserController, {
  summary: 'Update user (admin)',
  tags: ['Admin'],
  bodySchema: updateUserRequestSchema,
  responseSchema: updateUserResponseSchema,
  extraResponses: {
    401: { description: 'Unauthorized', schema: errorSchema },
    403: { description: 'Forbidden', schema: errorSchema },
    404: { description: 'User not found', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema },
  },
})

export default router
