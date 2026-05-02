/**
 * DELETE /api/connect/disconnect
 *
 * Disconnect (unlink) the Stripe Connect account associated with an
 * Application. Hard-deletes the local `ConnectedAccount` row so the user can
 * onboard again from scratch.
 *
 * For external Connect accounts (`isPlatformAccount: false`) we ALSO attempt
 * to call `stripe.accounts.del(stripeAccountId)`. Stripe's API docs:
 *   - Test-mode accounts can be deleted at any time.
 *   - Live-mode Express accounts can be deleted when all balances are zero.
 *   - Live-mode Standard accounts CANNOT be deleted via the API (the user has
 *     to do it from their own Stripe dashboard).
 * In either case we still want to remove the local row so the user is no
 * longer routing payments to the disconnected account from EZPay's side. We
 * therefore swallow Stripe deletion errors and log them as a warning.
 *
 * For platform-owned accounts (`isPlatformAccount: true`) we NEVER call
 * Stripe — they all share the single EZStart LLC account, deleting it would
 * break every platform-owned app at once.
 *
 * Auth: Bearer JWT or API key (mirrors other Connect routes).
 * RBAC: only the `ConnectedAccount.userId` (the user who linked it) OR a
 *   superadmin can disconnect.
 *
 * Audit: persists a `'connect.disconnected'` entry in the ezpay `audit_logs`
 *   collection with `{ applicationId, stripeAccountId, accountType,
 *   isPlatformAccount, stripeDeleted }`.
 *
 * @module apps/ezpay/api/src/routes/connect/disconnect
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { getConnectedAccountModel } from '../../models/ConnectedAccount.js'
import { getStripeInstance } from '../../services/stripe-connect.js'
import { isAdminUser } from '../../middleware/auth.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { auditLogService } from '../../services/audit-log.service.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const disconnectRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(disconnectRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const disconnectQuerySchema = z.object({
  applicationId: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Scope the disconnect to a single Application. When omitted the route disconnects the only ConnectedAccount the caller owns; if the caller owns multiple accounts, omitting this is ambiguous and yields a 400.'
    ),
})

const disconnectResponseSchema = z.object({
  success: z.boolean(),
  applicationId: z.string().optional(),
  stripeAccountId: z.string().optional(),
  /**
   * `true` when Stripe `accounts.del()` succeeded, `false` when it failed
   * (live-mode Standard accounts and balances > 0 cannot be deleted via the
   * API), and `null` for platform-owned accounts where we never call Stripe.
   */
  stripeDeleted: z.boolean().nullable().optional(),
  error: z.string().optional(),
})

// ========================================
// Route Handler
// ========================================

const disconnectHandler = async (req: Request, res: Response) => {
  try {
    const queryValidation = disconnectQuerySchema.safeParse(req.query)
    if (!queryValidation.success) {
      return sendValidationError(res, 'Invalid disconnect query', queryValidation.error.errors)
    }

    const { applicationId } = queryValidation.data
    const userId = req.userId as string

    const ConnectedAccount = await getConnectedAccountModel()

    // Resolve the target ConnectedAccount.
    // - When `applicationId` is supplied: scoped lookup (the common path used
    //   by `<DeveloperConnectDashboard>` which always knows its applicationId).
    // - When omitted: enumerate the caller's accounts. If there's exactly one
    //   we disconnect it (degenerate single-app case); if there are 0 we 404;
    //   if there are 2+ we 400 — disconnecting "the wrong app" silently would
    //   be a bad surprise.
    let account
    if (applicationId) {
      account = await ConnectedAccount.findOne({ applicationId, userId })
    } else {
      const userAccounts = await ConnectedAccount.find({ userId })
      if (userAccounts.length === 0) {
        return sendError(res, 'No connected account found', 404)
      }
      if (userAccounts.length > 1) {
        return sendError(
          res,
          'Multiple connected accounts found — pass ?applicationId= to disambiguate',
          400
        )
      }
      account = userAccounts[0]
    }

    // Allow superadmin to disconnect on a user's behalf (support flow). The
    // scoped lookup above already filters by `userId` for non-admins, so this
    // branch only matters when an admin scopes by `?applicationId=` for a
    // user that isn't them.
    if (!account && applicationId && isAdminUser(req)) {
      account = await ConnectedAccount.findOne({ applicationId })
    }

    if (!account) {
      return sendError(res, 'No connected account found', 404)
    }

    if (account.userId !== userId && !isAdminUser(req)) {
      return sendError(res, 'Not allowed to disconnect this account', 403)
    }

    const {
      stripeAccountId,
      accountType,
      isPlatformAccount,
      applicationId: accountApplicationId,
    } = account

    // Attempt Stripe deletion for external accounts only. We never delete the
    // shared platform account (would nuke every platform-owned app). For
    // external accounts we proceed even if Stripe refuses — the user's intent
    // is to disconnect from EZPay's side.
    let stripeDeleted: boolean | null = null
    if (!isPlatformAccount) {
      try {
        const stripe = getStripeInstance()
        await stripe.accounts.del(stripeAccountId)
        stripeDeleted = true
      } catch (err) {
        stripeDeleted = false
        logger.warn(
          `Stripe accounts.del failed for ${stripeAccountId} (continuing with local cleanup): ${
            err instanceof Error ? err.message : String(err)
          }`
        )
      }
    }

    // Hard-delete the local row — the user can re-onboard from scratch
    // anytime. Soft delete would force us to filter every Connect query for
    // `deletedAt: null`, which `dashboard-link`/`status`/`webhooks-connect`
    // currently don't do; we'd rather keep the invariant "row exists ⇒
    // account is live in EZPay".
    await ConnectedAccount.deleteOne({ _id: account._id })

    void auditLogService.createFromRequest(req, {
      action: 'connect.disconnected',
      userId,
      metadata: {
        applicationId: accountApplicationId,
        stripeAccountId,
        accountType,
        isPlatformAccount,
        stripeDeleted,
      },
    })

    logger.info('Connect account disconnected', {
      action: 'connect.disconnected',
      userId,
      applicationId: accountApplicationId,
      stripeAccountId,
      accountType,
      isPlatformAccount,
      stripeDeleted,
    })

    return sendSuccess(res, {
      applicationId: accountApplicationId,
      stripeAccountId,
      stripeDeleted,
    })
  } catch (error) {
    logger.error('Connect disconnect error:', error instanceof Error ? error : String(error))
    return sendError(res, error instanceof Error ? error.message : 'Failed to disconnect account')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.delete('/connect/disconnect', authJwtOrKey(), disconnectHandler, {
  summary:
    'Disconnect a Stripe Connect account from an Application — hard-deletes the local row and (for external accounts) calls Stripe accounts.del()',
  tags: ['Connect'],
  querySchema: disconnectQuerySchema,
  responseSchema: disconnectResponseSchema,
})

export { disconnectRegistry as registry, router }
export default router
