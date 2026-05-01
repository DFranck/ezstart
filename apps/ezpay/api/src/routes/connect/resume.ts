/**
 * POST /api/connect/onboarding/resume
 *
 * Resume an in-progress Stripe Connect onboarding for a ConnectedAccount whose
 * status is still `'pending'` and whose `createdAt` is less than 7 days old.
 * Returns a fresh Stripe `accountLinks.create` URL the caller redirects the
 * user to, exactly like `POST /connect/onboard` does for the first hop.
 *
 * Why a separate route (and not "just call /onboard again"):
 * - `/onboard` creates a brand-new Stripe account each call (and would 409
 *   here since the row already exists).
 * - Resume re-uses the EXISTING `stripeAccountId` so the user lands back in
 *   their half-filled Stripe form.
 * - We track `lastResumedAt` so the cleanup scheduler / dashboard can show
 *   how many days the user has left before the row is hard-deleted.
 *
 * Auth: Bearer JWT (same as /onboard). Ownership enforced on the
 *   ConnectedAccount.userId (matches the user who created it). Superadmin
 *   bypass via `isAdminUser` for support / debugging flows.
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
import { getApiUrl } from '@ezstart/config'
import { getConnectedAccountModel } from '../../models/ConnectedAccount.js'
import { getStripeInstance } from '../../services/stripe-connect.js'
import { authMiddleware, populateUserFromToken, isAdminUser } from '../../middleware/auth.js'
import { generateConnectState } from '../../utils/connect-state.js'
import { auditLogService } from '../../services/audit-log.service.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const resumeRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(resumeRegistry, router)

// ========================================
// Constants
// ========================================

/** Pending rows older than this are considered expired and refused for resume. */
export const RESUME_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

// ========================================
// Zod Schemas
// ========================================

const resumeBodySchema = z.object({
  connectedAccountId: z
    .string()
    .min(1)
    .describe('Mongo _id of the ConnectedAccount to resume onboarding for'),
  locale: z
    .string()
    .min(2)
    .max(5)
    .optional()
    .describe(
      'User locale propagated to the post-onboarding redirect back to the EZPay web UI (e.g. "en", "fr"). Defaults to "en" server-side.'
    ),
})

const resumeResponseSchema = z.object({
  success: z.boolean(),
  accountLinkUrl: z
    .string()
    .optional()
    .describe('Fresh Stripe onboarding URL to redirect the user'),
  expiresInMs: z
    .number()
    .optional()
    .describe('Milliseconds remaining before the pending row is auto-cleaned'),
  error: z.string().optional(),
})

// ========================================
// Route Handler
// ========================================

const resumeHandler = async (req: Request, res: Response) => {
  try {
    const validation = resumeBodySchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid resume data', validation.error.errors)
    }

    const { connectedAccountId, locale } = validation.data
    const userId = req.userId as string

    const ConnectedAccount = await getConnectedAccountModel()
    const account = await ConnectedAccount.findById(connectedAccountId)

    if (!account) {
      return sendError(res, 'Connected account not found', 404)
    }

    // Ownership — owner OR superadmin can resume. Mirror /onboard ACL.
    if (account.userId !== userId && !isAdminUser(req)) {
      return sendError(res, 'Not allowed to resume onboarding for this account', 403)
    }

    // Refuse if the account is past 'pending' — completed/restricted/disabled
    // accounts must use /connect/dashboard-link or /connect/disconnect, not
    // resume.
    if (account.status !== 'pending') {
      return sendError(
        res,
        `Cannot resume onboarding: account status is "${account.status}" (only "pending" is resumable)`,
        409
      )
    }

    // Refuse if expired (> 7 days). The cleanup scheduler will remove this
    // row on its next cycle — UX-wise we tell the user to start over.
    const ageMs = Date.now() - account.createdAt.getTime()
    if (ageMs > RESUME_EXPIRY_MS) {
      return sendError(
        res,
        'Onboarding link expired (older than 7 days). Please start a new onboarding.',
        410
      )
    }

    // Generate a fresh Stripe account link. We re-use the existing
    // stripeAccountId so the user lands back in their half-filled Stripe
    // form — Stripe's account_onboarding link continues exactly where they
    // left off.
    const stripe = getStripeInstance()
    const baseUrl = getApiUrl('ezpay')
    const localeQuery = locale ? `&locale=${encodeURIComponent(locale)}` : ''
    // Signed state — see `routes/connect/onboard.ts` for rationale.
    const state = generateConnectState({ applicationId: account.applicationId })
    const callbackUrl = `${baseUrl}/api/connect/callback?account_id=${account.stripeAccountId}${localeQuery}&state=${state}`

    const accountLink = await stripe.accountLinks.create({
      account: account.stripeAccountId,
      refresh_url: callbackUrl,
      return_url: callbackUrl,
      type: 'account_onboarding',
    })

    // Bump lastResumedAt so the dashboard / scheduler can surface "you have
    // X days left" without round-tripping to Stripe.
    account.lastResumedAt = new Date()
    await account.save()

    // Persist a structured audit-log entry in the ezpay `audit_logs`
    // collection (cf. `services/audit-log.service.ts`). Fire-and-forget — the
    // service swallows write errors via the shared logger so the resume
    // response is never blocked. We also keep the structured `logger.info`
    // line for Railway log searchability.
    void auditLogService.createFromRequest(req, {
      action: 'connect.onboard.resumed',
      userId,
      metadata: {
        connectedAccountId: account.id as string,
        stripeAccountId: account.stripeAccountId,
        applicationId: account.applicationId,
        ageMs,
      },
    })
    logger.info('Connect onboarding resumed', {
      action: 'connect.onboard.resumed',
      userId,
      connectedAccountId: account.id as string,
      stripeAccountId: account.stripeAccountId,
      applicationId: account.applicationId,
      ageMs,
    })

    return sendSuccess(res, {
      accountLinkUrl: accountLink.url,
      expiresInMs: Math.max(0, RESUME_EXPIRY_MS - ageMs),
    })
  } catch (error) {
    logger.error('Connect resume error:', error instanceof Error ? error : String(error))
    return sendError(res, error instanceof Error ? error.message : 'Failed to resume onboarding')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post('/connect/onboarding/resume', authMiddleware, populateUserFromToken, resumeHandler, {
  summary: 'Resume an in-progress Stripe Connect onboarding (status=pending and < 7 days old)',
  tags: ['Connect'],
  bodySchema: resumeBodySchema,
  responseSchema: resumeResponseSchema,
})

export { resumeRegistry as registry, router }
export default router
