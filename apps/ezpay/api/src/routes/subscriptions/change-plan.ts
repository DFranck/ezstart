/**
 * POST /api/subscriptions/:subscriptionId/change-plan — swap the Stripe
 * Price on an active subscription (upgrade / downgrade).
 *
 * Auth: Bearer JWT. Only the subscription owner (matched via the recorded
 * `Payment.userId`) or a superadmin can call the route.
 *
 * Flow:
 *   1. Locate the local `Payment` record for the subscription.
 *   2. Resolve the target `Plan` and validate it is active and exposes a
 *      `stripePriceId`.
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

import { authMiddleware, populateUserFromToken, isAdminUser } from '../../middleware/auth.js'
import { getPaymentModel } from '../../models/Payment.js'
import { getPlanModel } from '../../models/Plan.js'
import { getStripeInstance } from '../../services/stripe-connect.js'

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

    // Ownership — non-admins can only change their own subscription.
    if (!isAdminUser(req) && payment.userId !== userId) {
      return sendError(res, 'You can only change your own subscriptions', 403)
    }

    // 2. Resolve the new Plan — must be active and mirrored to Stripe.
    const Plan = await getPlanModel()
    const newPlan = await Plan.findById(newPlanId)
    if (!newPlan) {
      return sendError(res, 'Target plan not found', 404)
    }
    if (!newPlan.active || newPlan.deletedAt) {
      return sendError(res, 'Target plan is not active', 400)
    }
    if (!newPlan.stripePriceId) {
      return sendError(res, 'Target plan is not linked to a Stripe price', 400)
    }

    // 3. Retrieve the existing Stripe subscription + item.
    const stripe = getStripeInstance()
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
    logger.error('Change plan error:', error instanceof Error ? error : String(error))
    return sendError(
      res,
      error instanceof Error ? error.message : 'Failed to change subscription plan'
    )
  }
}

docRouter.post(
  '/subscriptions/:subscriptionId/change-plan',
  authMiddleware,
  populateUserFromToken,
  changePlanHandler,
  {
    summary: 'Change the plan on an active subscription (upgrade / downgrade)',
    tags: ['Subscriptions'],
    bodySchema: changePlanBodySchema,
    responseSchema: changePlanResponseSchema,
    extraResponses: {
      400: { description: 'Validation error', schema: errorResponseSchema },
      401: { description: 'Authentication required', schema: errorResponseSchema },
      403: { description: 'Not the subscription owner', schema: errorResponseSchema },
      404: { description: 'Subscription or plan not found', schema: errorResponseSchema },
    },
  }
)

export { changePlanRegistry as registry, router }
export default router
