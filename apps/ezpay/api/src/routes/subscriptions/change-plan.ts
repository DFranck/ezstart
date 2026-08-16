/**
 * POST /api/subscriptions/:subscriptionId/change-plan — swap the Stripe
 * Price on an active subscription (upgrade / downgrade).
 *
 * Auth: Bearer JWT. Only the subscription owner (matched via the recorded
 * `Payment.userId`) or a superadmin can call the route.
 *
 * Flow:
 *   1. Locate the local `Payment` record for the subscription.
 *   2. Resolve the CURRENT plan (`oldPlan`) from `Payment.metadata.planId` and
 *      the target `Plan` (`newPlan`) from the request. Assert both belong to
 *      the SAME Application via their immutable `applicationId` (id↔id), then
 *      validate the target is active and exposes a `stripePriceId`.
 *   3. Retrieve the Stripe Subscription to discover the existing item id.
 *   4. Call `stripe.subscriptions.update()` with the new price + proration.
 *   5. Reflect the new plan name/id in the local `Payment.metadata` so the
 *      dashboard shows the correct tier right away (webhook does the final
 *      reconciliation).
 *
 * @module apps/ezpay/api/src/routes/subscriptions/change-plan
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
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { getPaymentModel } from '../../models/Payment.js'
import { getPlanModel } from '../../models/Plan.js'
import { getStripeInstanceForMode } from '../../services/stripe-connect.js'
import { isStripeModeUnavailableError } from '../../services/stripe.js'
import { resolveTenantAccess } from '../../services/tenant-ownership.js'

export const changePlanRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(changePlanRegistry, router)

// ----------------------------------------------------------------------------
// Zod schemas
// ----------------------------------------------------------------------------

const changePlanParamsSchema = z.object({
  subscriptionId: z.string().min(1).describe('Stripe subscription id (sub_…)'),
})

const changePlanBodySchema = z.object({
  newPlanId: z.string().min(1).describe('Target Plan id (EZPay, NOT Stripe Price id)'),
  prorationBehavior: z
    .enum(['create_prorations', 'none', 'always_invoice'])
    .default('create_prorations')
    .describe('Stripe proration behaviour for the plan change'),
})

const changePlanResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    subscriptionId: z.string(),
    status: z.string(),
    currentPeriodEnd: z.number(),
    newPlanId: z.string(),
    newStripePriceId: z.string(),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

// ----------------------------------------------------------------------------
// Handler
// ----------------------------------------------------------------------------

const changePlanHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const paramsValidation = changePlanParamsSchema.safeParse(req.params)
    if (!paramsValidation.success) {
      return sendValidationError(res, 'Invalid subscription id', paramsValidation.error.errors)
    }

    const bodyValidation = changePlanBodySchema.safeParse(req.body ?? {})
    if (!bodyValidation.success) {
      return sendValidationError(res, 'Invalid change-plan payload', bodyValidation.error.errors)
    }

    const { subscriptionId } = paramsValidation.data
    const { newPlanId, prorationBehavior } = bodyValidation.data

    // 1. Locate the local subscription Payment.
    const Payment = await getPaymentModel()
    const payment = await Payment.findOne({
      'metadata.subscriptionId': subscriptionId,
      type: 'subscription',
    })
    if (!payment) {
      return sendError(res, 'Subscription not found', 404)
    }

    // Ownership — the subscriber may always change their own subscription.
    // Otherwise the caller must be a superadmin OR an admin of the Application
    // the subscription belongs to. A binary admin gate would let an app admin
    // re-price another tenant's subscription (cross-tenant escalation).
    if (payment.userId !== userId) {
      const access = await resolveTenantAccess(req, payment.projectId)
      if (!access.allowed) {
        return sendError(res, 'You can only change your own subscriptions', 403)
      }
    }

    // 2. Resolve BOTH the current plan and the target plan, then bind them on
    //    the immutable `applicationId` (id↔id), mirroring `subscribe`
    //    (subscriptions/create.ts) instead of the deprecated `appName` slug.
    const Plan = await getPlanModel()

    // 2a. Resolve the subscription's CURRENT plan from the recorded
    //     `Payment.metadata.planId`. This anchors the tenant identity to a
    //     concrete Plan row (whose `applicationId` is immutable), not the
    //     mutable `Payment.projectId` slug. Fail-closed (generic 404) when the
    //     id is absent or the plan no longer exists — never fall back to the
    //     slug, which is the deprecated, mutable field this fix removes.
    const oldPlanId = payment.metadata?.planId
    if (!oldPlanId) {
      return sendError(res, 'Target plan not found', 404)
    }
    const oldPlan = await Plan.findById(oldPlanId)
    if (!oldPlan) {
      return sendError(res, 'Target plan not found', 404)
    }

    // 2b. Resolve the new Plan — must be active and mirrored to Stripe.
    const newPlan = await Plan.findById(newPlanId)
    if (!newPlan) {
      return sendError(res, 'Target plan not found', 404)
    }
    // Tenant binding (HIGH-1 / LOW-1) — the target Plan MUST belong to the
    // SAME Application as the subscription's current plan. Without this, a
    // caller authorised for the subscription's tenant could re-price it onto a
    // cheaper Plan from ANOTHER tenant (`€1/usd` instead of `€49/eur`) — a
    // cross-tenant price-arbitrage. Both `Plan.applicationId` values are ezauth
    // Application ids that are immutable once minted, so the binding is a
    // direct id↔id equality — symmetric with `subscribe`. A mismatch returns a
    // generic 404 (NOT 403) so we never reveal another tenant's catalogue.
    if (newPlan.applicationId !== oldPlan.applicationId) {
      return sendError(res, 'Target plan not found', 404)
    }
    if (!newPlan.active || newPlan.deletedAt) {
      return sendError(res, 'Target plan is not active', 400)
    }
    if (!newPlan.stripePriceId) {
      return sendError(res, 'Target plan is not linked to a Stripe price', 400)
    }

    // 3. Retrieve the existing Stripe subscription + item. The subscription
    //    lives in the Stripe account matching the original Payment's partition
    //    (test/live) — derive the mode from the row, NOT the request, so the
    //    re-price hits the account that owns the subscription.
    const stripe = getStripeInstanceForMode(payment.isTestMode ? 'test' : 'live')
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const firstItem = subscription.items?.data?.[0]
    if (!firstItem) {
      return sendError(res, 'Subscription has no billable items', 400)
    }

    // 4. Swap the price.
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: firstItem.id,
          price: newPlan.stripePriceId,
        },
      ],
      proration_behavior: prorationBehavior,
    })

    // 5. Reflect the change in the local Payment — the webhook will write the
    //    authoritative record. We update eagerly so the UI reads the new plan
    //    name/id without waiting for the webhook round trip.
    const nextMetadata = {
      ...(payment.metadata ?? {}),
      planId: String(newPlan._id),
      planName: newPlan.name,
      features: newPlan.features ?? [],
    }
    payment.metadata = nextMetadata
    await payment.save()

    logger.info(
      `Subscription ${subscriptionId} re-priced to plan ${newPlanId} (proration=${prorationBehavior})`
    )

    // Stripe 22.x moved `current_period_end` from the Subscription root to
    // each SubscriptionItem. Surface the first item's value (all items share
    // the same period on a standard single-item subscription).
    const updatedFirstItem = updated.items?.data?.[0]
    const currentPeriodEnd = updatedFirstItem?.current_period_end ?? 0

    return sendSuccess(res, {
      subscriptionId,
      status: updated.status,
      currentPeriodEnd,
      newPlanId: String(newPlan._id),
      newStripePriceId: newPlan.stripePriceId,
    })
  } catch (error) {
    if (isStripeModeUnavailableError(error)) {
      logger.error(`Change plan refused — ${error.message}`)
      return sendError(res, `Payments are not available in ${error.mode} mode`, error.statusCode)
    }
    logger.error('Change plan error:', error instanceof Error ? error : String(error))
    return sendError(
      res,
      error instanceof Error ? error.message : 'Failed to change subscription plan'
    )
  }
}

docRouter.post('/subscriptions/:subscriptionId/change-plan', authJwtOrKey(), changePlanHandler, {
  summary: 'Change the plan on an active subscription (upgrade / downgrade)',
  tags: ['Subscriptions'],
  bodySchema: changePlanBodySchema,
  responseSchema: changePlanResponseSchema,
  extraResponses: {
    400: { description: 'Validation error', schema: errorResponseSchema },
    401: { description: 'Authentication required', schema: errorResponseSchema },
    403: { description: 'Not the subscription owner or app admin', schema: errorResponseSchema },
    404: { description: 'Subscription or plan not found', schema: errorResponseSchema },
  },
})

export { changePlanRegistry as registry, router }
export default router
