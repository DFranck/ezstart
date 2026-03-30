import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { getWaitlistModel } from '../../models/waitlist.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'

export const inviteWaitlistRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(inviteWaitlistRegistry, router)

// Schemas
const inviteRequestSchema = z.object({
  notes: z.string().optional().describe('Optional notes about the invitation'),
})

const inviteResponseSchema = z.object({
  success: z.boolean().describe('Indicates if the operation was successful'),
  accessCode: z.string().describe('Generated access code for beta access'),
  email: z.string().describe('Email that was invited'),
  appName: z.string().describe('Application name'),
})

const errorSchema = z.object({
  success: z.literal(false).describe('Always false for errors'),
  error: z.string().describe('Error message'),
})

// Invite an email from waitlist (generate access code)
const inviteWaitlistController = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!
    const isAdmin =
      currentUser.roles?.includes('admin') || currentUser.roles?.includes('superadmin')

    if (!isAdmin) {
      return sendError(res, 'Admin access required', 403)
    }

    const WaitlistModel = await getWaitlistModel()
    const appName = req.params.appName as string
    const email = req.params.email as string
    const { notes } = req.body

    // Find waitlist
    // @ts-expect-error - Mongoose type inference issue
    const waitlist = await WaitlistModel.findOne({ appName })

    if (!waitlist) {
      return sendError(res, `Waitlist not found for app: ${appName}`, 404)
    }

    // Find email entry
    const entry = waitlist.findEntryByEmail(email)

    if (!entry) {
      return sendError(res, `Email not found in waitlist: ${email}`, 404)
    }

    // Check if already invited
    if (entry.status === 'invited' && entry.accessCode) {
      return sendError(res, 'Email already invited', 409)
    }

    // Generate access code
    const accessCode = waitlist.generateAccessCode()

    // Check if user already exists with this email
    const AuthUserModel = await getAuthUserModel()
    const existingUser = await AuthUserModel.findOne({ email: email.toLowerCase() })

    if (existingUser) {
      // User exists - auto-grant access immediately
      logger.info(`✅ User exists: ${email} - Auto-granting beta-tester role for ${appName}`)

      // Add beta-tester role to appRoles if not already present
      if (!existingUser.appRoles) {
        existingUser.appRoles = new Map<string, string[]>()
      }

      const currentAppRoles = existingUser.appRoles.get(appName) || []
      if (!currentAppRoles.includes('beta-tester')) {
        currentAppRoles.push('beta-tester')
        existingUser.appRoles.set(appName, currentAppRoles)
      }

      // Add beta-tester to old roles field for backwards compatibility
      if (!existingUser.roles.includes('beta-tester')) {
        existingUser.roles.push('beta-tester')
      }

      // Add app to user's apps if not already present
      if (!existingUser.apps.includes(appName)) {
        existingUser.apps.push(appName)
      }

      await existingUser.save()

      // Update waitlist entry to 'activated' (not 'invited')
      entry.status = 'activated'
      entry.accessCode = accessCode
      entry.invitedAt = new Date()
      entry.invitedBy = currentUser._id
      entry.activatedAt = new Date()
      if (notes) {
        entry.notes = notes
      }

      await waitlist.save()

      logger.info(`✅ Auto-granted beta-tester role to ${email} for ${appName}`)

      return sendSuccess(res, {
        accessCode,
        email: entry.email,
        appName: waitlist.appName,
        autoGranted: true,
        message: 'User already exists - access granted immediately',
      })
    }

    // User doesn't exist - standard invite flow
    entry.status = 'invited'
    entry.accessCode = accessCode
    entry.invitedAt = new Date()
    entry.invitedBy = currentUser._id
    if (notes) {
      entry.notes = notes
    }

    await waitlist.save()

    // TODO: Send email with access code (implement email service later)
    logger.info(`📧 [TODO] Send beta access email to ${email} with code: ${accessCode}`)

    sendSuccess(res, {
      accessCode,
      email: entry.email,
      appName: waitlist.appName,
      autoGranted: false,
      message: 'Access code generated - user needs to register with code',
    })
  } catch (error) {
    logger.error('Error inviting from waitlist:', error)
    sendError(res, 'Failed to invite email', 500)
  }
}

docRouter.post('/:appName/:email/invite', verifyTokenMiddleware, inviteWaitlistController, {
  summary: 'Invite email from waitlist (generate access code)',
  tags: ['Admin', 'Waitlist'],
  bodySchema: inviteRequestSchema,
  responseSchema: inviteResponseSchema,
  status: 200,
  extraResponses: {
    403: { description: 'Forbidden - Admin access required', schema: errorSchema },
    404: { description: 'Waitlist or email not found', schema: errorSchema },
    409: { description: 'Email already invited', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema },
  },
})

export default router
