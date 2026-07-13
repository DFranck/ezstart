import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  createStrictRateLimiter,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { getWebUrl, type AppName } from '@ezstart/config'
import { getPaymentModel } from '../../models/Payment.js'
import { getPlanModel } from '../../models/Plan.js'
import { verifyUserExists } from '../../services/ezauth-client.js'
import {
  getProviderForRequest,
  resolveRequestMode,
  isStripeModeUnavailableError,
} from '../../services/stripe.js'
import { validatePromo, calculateDiscount } from '../../services/promo.js'
import { resolveConnectFee } from '../../services/connect-fee.js'
import { mapStripeError } from '../../utils/stripe-error.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { checkPayDemoQuotas } from '../../middleware/check-pay-demo-quotas.js'
import { assertApplicationAuthority } from '../_shared/checkout-authority.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

// Strict per-bucket rate limit (anti card-testing / checkout abuse). Buckets
// by authenticated user / API key / IP — see `createStrictRateLimiter`
// (5 req / min). Disabled under NODE_ENV=test so the shared loopback IP in
// supertest fixtures doesn't self-throttle.
const subscribeRateLimiter = createStrictRateLimiter({
  disabled: process.env.NODE_ENV === 'test',
})

export const createSubscriptionRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createSubscriptionRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const createSubscriptionSchema = z.object({
  projectId: z.string().max(100).describe('Project identifier'),
  applicationId: z
    .string()
    .optional()
    .describe(
      'ezauth Application id owning the checkout (required when not authenticated via API key)'
    ),
  planId: z.string().describe('Plan identifier (EZPay Plan id — price resolved server-side)'),
  planName: z
    .string()
    .optional()
    .describe('Plan display name (ignored — resolved server-side from the Plan)'),
  amount: z
    .number()
    .positive()
    .optional()
    .describe(
      'Ignored — the subscription price is resolved server-side from the linked Plan, never the client'
    ),
  interval: z.enum(['month']).default('month').describe('Billing interval (always month)'),
  intervalCount: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .describe('Ignored — billing cadence is resolved server-side from the linked Plan'),
  currency: z
    .string()
    .regex(/^[a-z]{3}$/i, 'Must be a valid ISO 4217 currency code')
    .optional()
    .describe('Ignored — currency is resolved server-side from the linked Plan'),
  customerEmail: z.string().email().optional().describe('Customer email'),
  returnUrl: z.string().url().optional().describe('Custom return URL after payment'),
  promoCode: z.string().optional().describe('Optional promo code for discount'),
  /**
   * Optional caller-supplied user id (MongoDB ObjectId, 24-char hex). Used
   * ONLY as a Priority-2 fallback when the JWT-derived `req.userId` is the
   * `'system'` sentinel — i.e. the caller authenticated via a publishable
   * key (`ez_pk_*`) rather than a session cookie. See the trust-boundary
   * JSDoc on the controller for the security rationale.
   */
  userId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'userId must be a MongoDB ObjectId (24-char hex)')
    .optional()
    .describe(
      'Optional caller-supplied user id — trusted only when JWT userId is the "system" sentinel'
    ),
})

const paymentResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payment: z.record(z.unknown()).optional().describe('Payment object with details'),
  checkoutUrl: z.string().optional().describe('Stripe checkout URL to redirect user'),
  error: z.string().optional().describe('Error message if operation failed'),
})

// ========================================
// Route Handler
// ========================================

const createSubscriptionHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const validation = createSubscriptionSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid subscription data', validation.error.errors)
    }

    const {
      projectId,
      applicationId: bodyApplicationId,
      planId,
      customerEmail,
      returnUrl,
      promoCode,
      userId: bodyUserId,
    } = validation.data

    /**
     * Resolve the effective `userId` for this subscription — with a hard
     * ownership proof requirement.
     *
     * **Trust boundary rationale.** Three auth paths lead here:
     *
     *   1. **JWT (session cookie / Bearer)** — `req.userId` is a real
     *      Mongo ObjectId derived from a validated ezauth session. If
     *      `body.userId` is also present it MUST match the JWT — no
     *      cross-user impersonation. Trusted absolutely otherwise.
     *   2. **Secret admin S2S key** (`ez_sk_*`, scope=`admin`) — the
     *      caller is another trusted service. `body.userId` is trusted
     *      because possession of a secret admin key is functionally
     *      equivalent to superadmin JWT.
     *   3. **Publishable key alone** (`ez_pk_*`) — a browser-safe key
     *      shipped in a consumer's bundle. `body.userId` is NOT trusted
     *      here because anyone with the key can forge it to another
     *      user's ObjectId. The pay-sdk client MUST also attach the
     *      user's JWT Bearer token (path #1). We reject the request
     *      with 401 "Ownership proof required".
     *
     * Additionally, `body.customerEmail` is trusted ONLY when the JWT-
     * ownership path (#1) is in play — the JWT-verified user context
     * establishes an email trust relationship. In path #2 (secret admin
     * S2S) the caller is a trusted service — it may legitimately pass an
     * email on behalf of the user. In path #3 we never reach here.
     *
     * We reject dangling references (`verifyUserExists` returns false → 400)
     * so a garbage id can't create an orphaned Payment row.
     */
    const apiKeyType = (req as Request & { apiKeyType?: 'publishable' | 'secret' }).apiKeyType
    const apiKeyScope = (req as Request & { apiKeyScope?: string }).apiKeyScope
    const isSecretAdminKey = apiKeyType === 'secret' && apiKeyScope === 'admin'

    let userId: string
    if (req.userId && req.userId !== 'system') {
      // Path 1 — JWT subject. The auth middleware refuses to attach
      // anything that isn't a valid ObjectId (or the `'system'` sentinel).
      // If body.userId is also present, it MUST match the JWT — otherwise
      // we'd be enabling cross-user impersonation on the JWT path.
      if (bodyUserId && bodyUserId !== req.userId) {
        return sendError(res, 'body.userId must match the authenticated JWT user', 403)
      }
      userId = req.userId
    } else if (bodyUserId && isSecretAdminKey) {
      // Path 2 — secret admin S2S key. Trusted service caller.
      const exists = await verifyUserExists(bodyUserId)
      if (!exists) {
        return sendError(res, 'Invalid userId', 400)
      }
      userId = bodyUserId
    } else if (bodyUserId) {
      // Path 3 — publishable key alone with body.userId. REJECT.
      // Possession of a publishable key does not prove any specific user
      // ownership. Require a JWT Bearer OR a secret S2S key.
      return sendError(
        res,
        'Ownership proof required for body.userId — attach JWT Bearer or use secret S2S key',
        401
      )
    } else {
      return sendError(res, 'Authentication required', 401)
    }

    // Tenant ownership gate (C-3) — resolve + authorise the Application from
    // the ezauth source-of-truth. API-key auth is trusted (bound at mint
    // time); Bearer auth must own the Application or be superadmin.
    const authz = await assertApplicationAuthority(req, bodyApplicationId)
    if (!authz.ok) {
      return sendError(res, authz.message, authz.status)
    }
    const applicationId = authz.applicationId

    // Price authority (C-1) — the subscription price is resolved SERVER-SIDE
    // from the linked Plan, never from the client body. Mirrors the
    // `subscriptions/change-plan.ts` pattern: the Plan must exist, be active,
    // and be mirrored to a Stripe Price. The client `amount` / `currency` /
    // `intervalCount` / `planName` fields are deliberately ignored.
    const Plan = await getPlanModel()
    const plan = await Plan.findById(planId).lean()
    if (!plan) {
      return sendError(res, 'Plan not found', 404)
    }
    // Tenant binding (HIGH-1) — the Plan MUST belong to the same Application
    // the caller is authorised for. Without this, a caller who owns app A
    // could reference a cheaper Plan from app B (`€1/usd` instead of their own
    // `€49/eur`) and pay the foreign price — a cross-tenant price-arbitrage.
    // `Plan.applicationId` and the resolved `applicationId` are both ezauth
    // Application ids, so the binding is a direct equality. A mismatch returns
    // a generic 404 (NOT 403) so we never reveal another tenant's catalogue.
    if (plan.applicationId !== applicationId) {
      return sendError(res, 'Plan not found', 404)
    }
    if (!plan.active || plan.deletedAt) {
      return sendError(res, 'Plan is not active', 400)
    }
    if (!plan.stripePriceId) {
      return sendError(res, 'Plan is not linked to a Stripe price', 400)
    }

    // `Plan.amount` is stored in cents; the provider expects major units (it
    // multiplies by 100 internally). Divide so we charge the catalogue price.
    const amount = plan.amount / 100
    const currency = plan.currency
    const planName = plan.name
    const intervalCount = plan.intervalCount
    const snapshotFeatures = plan.features || []
    const trialPeriodDays =
      typeof plan.trialDays === 'number' && plan.trialDays > 0 ? plan.trialDays : undefined

    // Promo code validation and discount calculation — applied to the
    // server-resolved price, never a client-supplied amount.
    let finalAmount = amount
    let promoMetadata: { promoCode?: string; originalAmount?: number; discountApplied?: number } =
      {}
    let promoId: string | undefined
    let validatedPromo: Awaited<ReturnType<typeof validatePromo>>['promo']

    if (promoCode) {
      const promoResult = await validatePromo(promoCode, projectId)
      if (!promoResult.valid) {
        return sendError(res, promoResult.reason || 'Invalid promo code', 400)
      }

      validatedPromo = promoResult.promo
      const discount = calculateDiscount(amount, promoResult.promo!)
      finalAmount = discount.discountedAmount
      promoId = String(promoResult.promo!._id)
      promoMetadata = {
        promoCode: promoResult.promo!.code,
        originalAmount: discount.originalAmount,
        discountApplied: discount.discountApplied,
      }
    }

    const baseUrl = returnUrl || getWebUrl(projectId as AppName)

    // Resolve Connect fee for the target Application (may be the caller's
    // own app via API-key auth, or a body-supplied id for Bearer flows).
    const connectFee = await resolveConnectFee(applicationId, Math.round(amount * 100))

    // Enable Stripe automatic tax on subscription checkouts by default.
    // Consumers must configure Stripe Tax in the Stripe Dashboard
    // (Settings → Tax) — otherwise Stripe will still accept the request and
    // charge no tax. Opt out via env var for merchants that handle tax
    // externally.
    const automaticTax = process.env.STRIPE_AUTOMATIC_TAX !== 'false'

    // Select the Stripe provider for the caller's derived mode. A test key
    // (`ez_pk_test_*`) routes through the test Stripe account; a live key
    // through the live account. Fail-closed (503) when the mode's key is
    // missing — never silently downgrade a test request to the live account.
    const provider = getProviderForRequest(req)
    const session = await provider.createSubscriptionCheckout({
      amount, // FULL server-resolved price — provider handles discount via native mechanism (coupon)
      currency,
      interval: 'month',
      intervalCount,
      description: `Subscription: ${planName}`,
      metadata: {
        type: 'subscription',
        projectId,
        planId,
        planName,
        userId,
        promoId: promoId || '',
      },
      successUrl: `${baseUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/subscribe/cancel`,
      automaticTax,
      ...(trialPeriodDays !== undefined ? { trialPeriodDays } : {}),
      discount: validatedPromo
        ? {
            type: validatedPromo.discountType,
            value: validatedPromo.discountValue,
            duration: validatedPromo.duration,
            durationInMonths: validatedPromo.durationInMonths,
            code: promoCode,
          }
        : undefined,
      connect:
        connectFee.isConnect && connectFee.stripeAccountId
          ? {
              destinationAccountId: connectFee.stripeAccountId,
              // Subscriptions prefer percent — Stripe applies it to every
              // recurring invoice automatically via `application_fee_percent`.
              applicationFeePercent: connectFee.applicationFeePercent,
            }
          : undefined,
    })

    // Test/live partition is driven by the CALLER's key (`req.derivedMode`),
    // never by the process env prefix — otherwise a test key on a live process
    // would write live-tagged rows (Wave E MED-2).
    const mode = resolveRequestMode(req)
    const isTestMode = mode === 'test'

    const payment = await Payment.create({
      projectId,
      projectName: projectId,
      type: 'subscription',
      amount: finalAmount,
      currency,
      userId,
      customerEmail,
      isAnonymous: false,
      provider: 'stripe',
      paymentId: session.sessionId,
      status: 'pending',
      liveMode: !isTestMode,
      isTestMode,
      metadata: {
        planId,
        planName,
        interval: 'month',
        intervalCount,
        features: snapshotFeatures,
        ...promoMetadata,
      },
    })

    // Promo usage is incremented in the webhook handler (checkout.completed)
    // to avoid wasting promo uses on abandoned checkouts

    logger.info(`💳 Subscription created - Session ID: ${session.sessionId}`)

    sendSuccess(res, { payment, checkoutUrl: session.url })
  } catch (error) {
    // Fail-closed: the caller's mode (test/live) has no Stripe key configured.
    // Surface a 503 — NEVER fall back to the other mode's account.
    if (isStripeModeUnavailableError(error)) {
      logger.error(`Subscription checkout refused — ${error.message}`)
      return sendError(res, `Payments are not available in ${error.mode} mode`, error.statusCode)
    }
    const stripeMapped = mapStripeError(error)
    if (stripeMapped) {
      logger.warn(
        `Stripe rejected subscription checkout (${stripeMapped.code}): ${stripeMapped.message}`
      )
      return sendError(res, stripeMapped.message, stripeMapped.status, { code: stripeMapped.code })
    }
    logger.error('Create subscription error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to create subscription')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post(
  '/subscribe',
  subscribeRateLimiter,
  authJwtOrKey(),
  checkPayDemoQuotas,
  createSubscriptionHandler,
  {
    summary: 'Create a subscription checkout session',
    tags: ['Subscriptions'],
    bodySchema: createSubscriptionSchema,
    responseSchema: paymentResponseSchema,
    status: 201,
  }
)

export { createSubscriptionRegistry as registry, router }
export default router
