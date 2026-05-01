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
import crypto from 'crypto'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { requireAdmin } from './require-admin.js'
import { verifyCookieCsrf } from '../../middleware/csrf.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import { adminUserSchema, adminErrorSchema } from '../../types/admin-schemas.js'
import { AuditLogService } from '../../services/audit-log.service.js'
import { emailService } from '../../services/email.service.js'
import { emailVerificationTemplate } from '@ezstart/email-service'
import { getAppDisplayName, buildAuthEmailParams } from '../../utils/app-display.js'
import { resolveUserLocale } from '../../utils/locale.js'
import { getWebUrl } from '@ezstart/config/urls'

export const updateUserRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(updateUserRegistry, router)

/**
 * Default soft-delete grace period for admin-triggered deactivation.
 * Mirrors the user-initiated `DELETE /auth/account` policy so admins and
 * users converge on the same lifecycle state machine.
 *
 * 30 days matches the `deletedAt` / `scheduledHardDeleteAt` semantics in
 * `auth-user.ts` (cf. `standard-saas-data.md` §5 — soft delete).
 */
const SOFT_DELETE_GRACE_DAYS = 30

// Schemas
const updateUserRequestSchema = z.object({
  // Profile fields (admin can edit on behalf of user)
  firstName: z.string().trim().min(1).max(80).optional().describe("User's first name"),
  lastName: z.string().trim().min(1).max(80).optional().describe("User's last name"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(254)
    .email()
    .optional()
    .describe(
      "User's email address. When changed, isVerified is reset to false and a fresh verification email is sent."
    ),

  // Role structure
  globalRoles: z
    .array(z.enum(['superadmin']))
    .optional()
    .describe('Global roles to assign'),
  appRoles: z
    .record(z.string(), z.array(z.string().min(1).max(64)))
    .optional()
    .describe(
      'Per-app roles mapping (free-form strings, e.g. "admin", "pro", "enterprise", "beta-tester")'
    ),

  // Permissions / features
  permissions: z.array(z.string()).optional().describe('User permissions'),
  features: z.array(z.string()).optional().describe('Enabled feature flags'),
  apps: z.array(z.string()).optional().describe('Accessible applications'),

  // Status toggles (admin-only)
  isVerified: z
    .boolean()
    .optional()
    .describe('Force-verify the email without making the user click a link (admin override)'),
  isActive: z
    .boolean()
    .optional()
    .describe(
      'Active flag — false soft-deletes the account (sets deletedAt + 30-day grace period). True restores a soft-deleted account.'
    ),
  mustChangePassword: z
    .boolean()
    .optional()
    .describe(
      'Force the user to reset their password at the next login (suspected leak / manual provisioning).'
    ),

  // Misc
  organizationId: z.string().optional().describe('Organization ID'),
  managedBy: z.string().optional().describe('Manager user ID'),

  // Email templating context (used only when `email` changes — same shape as
  // /auth/send-verification body so consumers can reuse their i18n config).
  emailVerificationApp: z
    .string()
    .optional()
    .describe('App slug used to brand the verification email when email changes'),
  emailVerificationLocale: z
    .enum(['en', 'fr', 'vi'])
    .optional()
    .describe('Locale for the verification email'),
})

const updateUserResponseSchema = z.object({
  user: adminUserSchema.describe('Updated user object'),
  message: z.string().describe('Success message'),
  /**
   * Set to `true` when `email` was changed and a fresh verification link
   * was sent to the new address. Lets the admin UI surface a confirmation
   * toast like "Verification email sent to user@new.com".
   */
  verificationEmailSent: z
    .boolean()
    .optional()
    .describe('True when email was changed and a new verification link was sent.'),
})

// Params validation schema
const updateUserParamsSchema = z.object({
  id: z
    .string()
    .min(1, 'User ID is required')
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
    .describe('MongoDB ObjectId of the user to update'),
})

/**
 * Send a fresh email-verification link to `targetEmail`. Mirrors the flow in
 * `routes/auth/send-verification.ts` but adapted for the admin context (no
 * rate limit, no auth check — gated by `requireAdmin` upstream). Failures are
 * logged and surfaced as a 500 to let the admin retry.
 */
async function sendVerificationEmailToAddress(
  req: Request,
  userId: string,
  targetEmail: string,
  appKey: string | undefined,
  bodyLocale: 'en' | 'fr' | 'vi' | undefined
): Promise<void> {
  const AuthCodeModel = await getAuthCodeModel()
  const token = crypto.randomBytes(32).toString('hex')

  await AuthCodeModel.create({
    code: token,
    userId,
    type: 'email-verification',
    app: appKey || 'ezauth',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
  })

  const appDisplayName = getAppDisplayName(appKey)
  const params = buildAuthEmailParams(token, appKey)
  const verifyUrl = `${getWebUrl('ezauth')}/verify-email?${params}`
  const locale = resolveUserLocale(req, bodyLocale)
  const rendered = emailVerificationTemplate(
    { verifyUrl },
    { appName: appDisplayName, appKey: appKey || 'ezauth', locale }
  )

  await emailService.send({
    to: targetEmail,
    from: rendered.from ?? `${appDisplayName} <noreply@ezstart.xyz>`,
    ...(rendered.replyTo ? { replyTo: rendered.replyTo } : {}),
    subject: rendered.subject,
    html: rendered.html,
    ...(rendered.text ? { text: rendered.text } : {}),
  })
}

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
    // Use `includeDeleted` so a superadmin can re-activate a soft-deleted
    // account (without this opt-out the soft-delete pre-find guard would
    // hide the record and return 404).
    const user = await AuthUser.findById(parsedParams.data.id).setOptions({
      includeDeleted: true,
    })

    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    const body = parsedBody.data
    const targetUserId = parsedParams.data.id
    const isSelf = targetUserId === currentUser._id

    // Track changes for audit logs (each sensitive change emits its own entry).
    const changedFields: string[] = []
    let verificationEmailSent = false
    let emailChange: { oldEmail: string; newEmail: string } | null = null

    // ─── Profile fields ────────────────────────────────────────────────────
    if (body.firstName !== undefined && body.firstName !== user.firstName) {
      user.firstName = body.firstName
      changedFields.push('firstName')
    }
    if (body.lastName !== undefined && body.lastName !== user.lastName) {
      user.lastName = body.lastName
      changedFields.push('lastName')
    }

    // ─── Email change ──────────────────────────────────────────────────────
    if (body.email !== undefined && body.email !== user.email.toLowerCase()) {
      // Reject if the requested email is taken by another user.
      const conflict = await AuthUser.findOne({
        email: body.email,
        _id: { $ne: user._id },
      })
      if (conflict) {
        return sendError(res, 'Email already taken by another account', 409, {
          code: 'EMAIL_ALREADY_TAKEN',
        })
      }
      emailChange = { oldEmail: user.email, newEmail: body.email }
      user.email = body.email
      // Reset verification — admin-triggered email changes always require
      // re-verification (never silently mark as verified, even when the
      // admin also passes `isVerified: true`; this prevents an admin from
      // bypassing email proof entirely).
      user.isVerified = false
      changedFields.push('email')
    }

    // ─── Roles ─────────────────────────────────────────────────────────────
    if (body.globalRoles !== undefined) {
      const targetIsSuperAdmin = user.globalRoles?.includes('superadmin')

      // Prevent modifying globalRoles of another superadmin (peer protection).
      if (targetIsSuperAdmin && !isSelf) {
        return sendError(res, 'Cannot modify globalRoles of another superadmin', 403)
      }

      // Prevent removing your own superadmin role (self-lockout protection).
      if (isSelf && !body.globalRoles.includes('superadmin')) {
        return sendError(res, 'Cannot remove your own superadmin role', 400)
      }

      user.globalRoles = body.globalRoles
      changedFields.push('globalRoles')
    }

    if (body.appRoles !== undefined) {
      const appRolesMap = new Map<string, string[]>()
      Object.entries(body.appRoles).forEach(([app, roles]) => {
        appRolesMap.set(app, roles as string[])
      })
      user.appRoles = appRolesMap
      changedFields.push('appRoles')
    }

    // ─── Status: isVerified (admin force-verify) ───────────────────────────
    // Skip when email was changed in the same request — email-change always
    // resets isVerified to false and forces a fresh verification email,
    // overriding any incoming isVerified value (anti-bypass).
    if (body.isVerified !== undefined && !emailChange) {
      if (body.isVerified !== user.isVerified) {
        user.isVerified = body.isVerified
        changedFields.push('isVerified')
        if (body.isVerified === true) {
          void AuditLogService.createFromRequest(req, {
            userId: targetUserId,
            action: 'admin_force_verified',
            metadata: {
              actorId: currentUser._id,
              actorEmail: currentUser.email,
            },
          })
        }
      }
    }

    // ─── Status: isActive (soft-delete toggle) ─────────────────────────────
    if (body.isActive !== undefined) {
      if (isSelf && body.isActive === false) {
        return sendError(
          res,
          'Cannot deactivate your own account via admin endpoint. Use DELETE /auth/account instead.',
          400
        )
      }

      const isCurrentlyActive = !user.deletedAt
      if (body.isActive && !isCurrentlyActive) {
        // Reactivate — clear the soft-delete fields.
        user.deletedAt = null
        user.scheduledHardDeleteAt = null
        changedFields.push('isActive')
        void AuditLogService.createFromRequest(req, {
          userId: targetUserId,
          action: 'admin_account_reactivated',
          metadata: {
            actorId: currentUser._id,
            actorEmail: currentUser.email,
          },
        })
      } else if (!body.isActive && isCurrentlyActive) {
        // Prevent deactivating another superadmin (peer protection).
        if (user.globalRoles?.includes('superadmin')) {
          return sendError(res, 'Cannot deactivate a superadmin user. Demote them first.', 403)
        }
        const now = new Date()
        const scheduledHardDelete = new Date(
          now.getTime() + SOFT_DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000
        )
        user.deletedAt = now
        user.scheduledHardDeleteAt = scheduledHardDelete
        changedFields.push('isActive')
        void AuditLogService.createFromRequest(req, {
          userId: targetUserId,
          action: 'admin_account_deactivated',
          metadata: {
            actorId: currentUser._id,
            actorEmail: currentUser.email,
            scheduledHardDeleteAt: scheduledHardDelete.toISOString(),
          },
        })
      }
    }

    // ─── Status: mustChangePassword ────────────────────────────────────────
    if (body.mustChangePassword !== undefined) {
      const previous = user.mustChangePassword ?? false
      if (body.mustChangePassword !== previous) {
        user.mustChangePassword = body.mustChangePassword
        changedFields.push('mustChangePassword')
        if (body.mustChangePassword === true) {
          void AuditLogService.createFromRequest(req, {
            userId: targetUserId,
            action: 'admin_must_change_password_set',
            metadata: {
              actorId: currentUser._id,
              actorEmail: currentUser.email,
            },
          })
        }
      }
    }

    // ─── Misc passthrough fields ───────────────────────────────────────────
    const passthroughFields = [
      'permissions',
      'features',
      'apps',
      'organizationId',
      'managedBy',
    ] as const
    passthroughFields.forEach(field => {
      if ((body as Record<string, unknown>)[field] !== undefined) {
        const newValue = (body as Record<string, unknown>)[field]
        const currentValue = (user as unknown as Record<string, unknown>)[field]
        if (JSON.stringify(newValue) !== JSON.stringify(currentValue)) {
          ;(user as unknown as Record<string, unknown>)[field] = newValue
          changedFields.push(field)
        }
      }
    })

    await user.save()

    // ─── Email change side-effect: send fresh verification email ───────────
    // We send AFTER the save so the new email is persisted before the link
    // is e-mailed (otherwise a user who clicks instantly would land on a
    // race-condition mismatch).
    if (emailChange) {
      try {
        await sendVerificationEmailToAddress(
          req,
          targetUserId,
          emailChange.newEmail,
          body.emailVerificationApp,
          body.emailVerificationLocale
        )
        verificationEmailSent = true
        logger.info(
          {
            userId: targetUserId,
            oldEmail: emailChange.oldEmail,
            newEmail: emailChange.newEmail,
            actorId: currentUser._id,
          },
          'Admin changed user email — verification link sent to new address'
        )
        void AuditLogService.createFromRequest(req, {
          userId: targetUserId,
          action: 'admin_email_changed',
          metadata: {
            actorId: currentUser._id,
            actorEmail: currentUser.email,
            oldEmail: emailChange.oldEmail,
            newEmail: emailChange.newEmail,
          },
        })
      } catch (emailErr) {
        // Email send failures are logged but do NOT roll back the email
        // change — the admin can manually trigger a re-send from the UI.
        logger.error('Failed to send verification email after admin email change:', emailErr)
      }
    }

    // ─── Catch-all audit log for any change ────────────────────────────────
    // Lets compliance reviewers see "admin X touched user Y at time Z" even
    // when the granular per-action logs above don't cover the field (e.g.
    // firstName / lastName / appRoles / passthrough fields).
    if (changedFields.length > 0) {
      void AuditLogService.createFromRequest(req, {
        userId: targetUserId,
        action: 'admin_user_updated',
        metadata: {
          actorId: currentUser._id,
          actorEmail: currentUser.email,
          changedFields,
        },
      })
    }

    // IMPORTANT: use toAuthUser() to avoid leaking passwordHash (previously
    // `...user.toObject()` exposed the bcrypt hash in admin responses).
    sendSuccess(res, {
      user: user.toAuthUser(),
      message: 'User updated successfully',
      verificationEmailSent,
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
      400: { description: 'Bad request', schema: adminErrorSchema },
      401: { description: 'Unauthorized', schema: adminErrorSchema },
      403: { description: 'Forbidden', schema: adminErrorSchema },
      404: { description: 'User not found', schema: adminErrorSchema },
      409: { description: 'Email already taken', schema: adminErrorSchema },
      500: { description: 'Server error', schema: adminErrorSchema },
    },
  }
)

export default router
