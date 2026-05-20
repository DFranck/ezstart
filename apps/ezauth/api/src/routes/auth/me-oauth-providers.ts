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
import { logger } from '@ezstart/logger/server'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import { verifyTokenMiddleware as authMiddleware } from '../../middleware/auth.js'
import { getOAuthAccountModel } from '../../models/oauth-account.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { AuditLogService } from '../../services/audit-log.service.js'

export const meOAuthProvidersRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(meOAuthProvidersRegistry, router)

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Providers we are willing to expose / unlink via this endpoint. */
const SUPPORTED_PROVIDERS = ['google', 'github', 'facebook', 'apple'] as const
type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number]

const providerParamSchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS).describe('OAuth provider identifier'),
})

const oauthProviderSchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS).describe('Provider name'),
  email: z.string().describe('Email reported by the provider'),
  displayName: z.string().optional().describe('Display name from the provider'),
  connectedAt: z.string().describe('ISO timestamp of when the account was linked'),
})

const oauthProvidersResponseSchema = z.object({
  providers: z.array(oauthProviderSchema).describe('List of connected OAuth providers'),
})

const disconnectResponseSchema = z.object({
  message: z.string().describe('Success message'),
})

// ---------------------------------------------------------------------------
// GET /auth/me/oauth-providers — list connected providers
// ---------------------------------------------------------------------------

const listProvidersController = async (req: Request, res: Response) => {
  try {
    const OAuthAccount = await getOAuthAccountModel()
    const accounts = await OAuthAccount.find({ userId: req.userId! }).sort({ createdAt: 1 })

    const providers = accounts.map(account => ({
      provider: account.provider,
      email: account.email,
      displayName: account.displayName,
      connectedAt: account.createdAt.toISOString(),
    }))

    sendSuccess(res, { providers })
  } catch (error) {
    // MED-1 — generic message; raw error.message would leak DB internals.
    logger.error('List OAuth providers error:', error)
    sendError(res, 'Failed to list OAuth providers', 500)
  }
}

// ---------------------------------------------------------------------------
// DELETE /auth/me/oauth-providers/:provider — disconnect one provider
// ---------------------------------------------------------------------------

const disconnectProviderController = async (req: Request, res: Response) => {
  try {
    const parsed = providerParamSchema.safeParse(req.params)
    if (!parsed.success) {
      return sendError(res, 'Unsupported provider', 400)
    }
    const provider: SupportedProvider = parsed.data.provider

    const [OAuthAccount, AuthUser] = await Promise.all([getOAuthAccountModel(), getAuthUserModel()])

    // 1. The OAuth account must actually exist for this user.
    const account = await OAuthAccount.findOne({ userId: req.userId!, provider })
    if (!account) {
      return sendError(res, 'OAuth provider not connected', 404)
    }

    // 2. Refuse to remove the LAST login method.
    //    A user without a self-set password who has only this OAuth account
    //    left would be permanently locked out — block the unlink and ask the
    //    consumer UI to set a password first.
    const user = await AuthUser.findById(req.userId!)
    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    const hasPassword = Boolean(user.passwordHash) && user.hasSetOwnPassword !== false
    if (!hasPassword) {
      const remaining = await OAuthAccount.countDocuments({ userId: req.userId! })
      if (remaining <= 1) {
        return sendError(res, 'Cannot remove last login method, set a password first', 409)
      }
    }

    await OAuthAccount.deleteOne({ _id: account._id })

    void AuditLogService.createFromRequest(req, {
      userId: req.userId!,
      action: 'oauth_unlink',
      metadata: { provider, providerEmail: account.email },
    })

    sendSuccess(res, { message: `${provider} account disconnected` })
  } catch (error) {
    // MED-1 — generic message; raw error.message would leak DB internals.
    // All intentional client messages above are returned inline before this.
    logger.error('Disconnect OAuth provider error:', error)
    sendError(res, 'Failed to disconnect OAuth provider', 500)
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

docRouter.get('/me/oauth-providers', authMiddleware, listProvidersController, {
  summary: 'List the OAuth providers connected to the current user',
  tags: ['User'],
  responseSchema: oauthProvidersResponseSchema,
  extraResponses: {
    401: { description: 'Authentication required', schema: errorResponseSchema },
  },
})

docRouter.delete('/me/oauth-providers/:provider', authMiddleware, disconnectProviderController, {
  summary: 'Disconnect an OAuth provider from the current user',
  tags: ['User'],
  paramsSchema: providerParamSchema,
  responseSchema: disconnectResponseSchema,
  extraResponses: {
    400: { description: 'Unsupported provider', schema: errorResponseSchema },
    401: { description: 'Authentication required', schema: errorResponseSchema },
    404: { description: 'Provider not connected', schema: errorResponseSchema },
    409: {
      description: 'Cannot remove the last login method without a password',
      schema: errorResponseSchema,
    },
  },
})

export default router
