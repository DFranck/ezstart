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
import {
  getProviderForRequest,
  resolveRequestMode,
  isStripeModeUnavailableError,
} from '../../services/stripe.js'
import { validatePromo, calculateDiscount } from '../../services/promo.js'
import { resolveConnectFee } from '../../services/connect-fee.js'
import { mapStripeError } from '../../utils/stripe-error.js'
import { authMiddleware, populateUserFromToken } from '../../middleware/auth.js'
import { checkPayDemoQuotas } from '../../middleware/check-pay-demo-quotas.js'
import { assertApplicationAuthority, resolvePurchasePrice } from '../_shared/checkout-authority.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

// Strict per-bucket rate limit (anti card-testing / checkout abuse). See
// `createStrictRateLimiter` (5 req / min). Disabled under NODE_ENV=test.
const purchaseRateLimiter = createStrictRateLimiter({
  disabled: process.env.NODE_ENV === 'test',
})

export const createPurchaseRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createPurchaseRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const createPurchaseSchema = z.object({
  projectId: z.string().max(100).describe('Project identifier'),
  applicationId: z
    .string()
    .optional()
    .describe(
      'ezauth Application id owning the checkout (required when not authenticated via API key)'
    ),
  productId: z.string().describe('Product identifier (price resolved server-side from catalogue)'),
  productName: z
    .string()
    .optional()
    .describe('Ignored — resolved server-side from the product catalogue'),
  amount: z
    .number()
    .positive()
    .optional()
    .describe(
      'Ignored — the purchase price is resolved server-side from the product catalogue, never the client'
    ),
  currency: z
    .string()
    .regex(/^[a-z]{3}$/i, 'Must be a valid ISO 4217 currency code')
    .optional()
    .describe('Ignored — currency is resolved server-side from the product catalogue'),
  customerEmail: z
    .string()
    .email()
    .optional()
    .describe(
      'Ignored — the purchase route is JWT-authenticated, so the persisted receipt email is the ezauth-verified identity email (`req.user.email`), never the client body (anti dunning-spam). Kept for backcompat.'
    ),
  returnUrl: z.string().url().optional().describe('Custom return URL after payment'),
  promoCode: z.string().optional().describe('Optional promo code for discount'),
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

const createPurchaseHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const validation = createPurchaseSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid purchase data', validation.error.errors)
    }

    const {
      projectId,
      applicationId: bodyApplicationId,
      productId,
      returnUrl,
      promoCode,
    } = validation.data

    // Always use the authenticated user ID from JWT, never from the request body
    const userId = req.userId

    /**
     * Customer email trust boundary (anti dunning-spam).
     *
     * The persisted `Payment.customerEmail` is the same column
     * `dunning.service.ts` reads as `to:` when it sends retry emails. It
     * ignores `type: 'purchase'` rows today, so this endpoint is not
     * exploitable yet — but the moment a purchase-receipt email is wired up,
     * an attacker-controlled `body.customerEmail` would let a JWT user
     * trigger emails to an arbitrary address. We fix it proactively.
     *
     * This route is JWT-only (`authMiddleware` + `populateUserFromToken` —
     * NOT `authJwtOrKey`), and non-anonymous (`isAnonymous: false`). Unlike
     * `/subscribe` there is no secret-admin S2S key path, and unlike
     * `/donate` there is no anonymous donor path. So there is exactly one
     * trust boundary: the ezauth-verified identity. We therefore NEVER use
     * the request body — we use `req.user.email` (populated from the token).
     *
     * **isVerified gate (PAY-SUB-UNVERIFIED-EMAIL-DUNNING-001).** A valid JWT
     * signature proves only that the account exists, NOT that its email was
     * verified — ezauth intentionally lets unverified accounts log in (Clerk
     * pattern). An attacker can therefore register with a VICTIM's email
     * (`isVerified: false`), obtain a JWT carrying that email, and check out.
     * If we persisted it, a future purchase-receipt / dunning email would be
     * mailed to the victim. We close this by only trusting `req.user.email`
     * when `req.user.isVerified === true`; otherwise we store NO email at all
     * (never the body, never an unverified claim). The Zod schema keeps
     * `customerEmail` for backcompat but the value is deliberately ignored.
     */
    const resolvedCustomerEmail = req.user?.isVerified === true ? req.user?.email : undefined

    // Tenant ownership gate (C-3) — resolve + authorise the Application from
    // the ezauth source-of-truth. API-key auth is trusted (bound at mint
    // time); Bearer auth must own the Application or be superadmin.
    const authz = await assertApplicationAuthority(req, bodyApplicationId)
    if (!authz.ok) {
      return sendError(res, authz.message, authz.status)
    }
    const applicationId = authz.applicationId

    // Price authority (C-1) — the purchase price + currency + name are
    // resolved SERVER-SIDE from the product catalogue keyed by `productId`.
    // The client `amount` / `currency` / `productName` are deliberately
    // ignored. An unknown `productId` is a 400.
    const product = resolvePurchasePrice(productId)
    if (!product) {
      return sendError(res, 'Unknown productId', 400)
    }
    const amount = product.amount
    const currency = product.currency
    const productName = product.productName

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

    // Resolve Connect fee for the target Application
    const connectFee = await resolveConnectFee(applicationId, Math.round(finalAmount * 100))

    // Stripe automatic tax — opt-out via env var. See subscribe route for details.
    const automaticTax = process.env.STRIPE_AUTOMATIC_TAX !== 'false'

    // Select the Stripe provider for the caller's derived mode (test/live).
    // Fail-closed when the mode's key is missing — see services/stripe.ts.
    const provider = getProviderForRequest(req)
    const session = await provider.createCheckoutSession({
      amount: finalAmount, // Discounted amount OK for one-time purchases
      currency,
      description: `Purchase: ${productName}`,
      metadata: {
        type: 'purchase',
        projectId,
        productId,
        productName,
        userId: userId || '',
        promoId: promoId || '',
      },
      successUrl: `${baseUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/purchase/cancel`,
      automaticTax,
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
              // One-shots use cents-based fee
              applicationFeeAmount: connectFee.applicationFeeAmount,
            }
          : undefined,
    })

    // Test/live partition is driven by the CALLER's key (`req.derivedMode`),
    // never by the process env prefix (Wave E MED-2).
    const mode = resolveRequestMode(req)
    const isTestMode = mode === 'test'

    const payment = await Payment.create({
      projectId,
      projectName: projectId,
      type: 'purchase',
      amount: finalAmount,
      currency,
      userId,
      customerEmail: resolvedCustomerEmail,
      isAnonymous: false,
      provider: 'stripe',
      paymentId: session.sessionId,
      status: 'pending',
      liveMode: !isTestMode,
      isTestMode,
      metadata: {
        productId,
        productName,
        ...promoMetadata,
      },
    })

    // Promo usage is incremented in the webhook handler (checkout.completed)
    // to avoid wasting promo uses on abandoned checkouts

    logger.info(`💳 Purchase created - Session ID: ${session.sessionId}`)

    sendSuccess(res, { payment, checkoutUrl: session.url })
  } catch (error) {
    // Fail-closed: the caller's mode has no Stripe key — 503, never downgrade.
    if (isStripeModeUnavailableError(error)) {
      logger.error(`Purchase checkout refused — ${error.message}`)
      return sendError(res, `Payments are not available in ${error.mode} mode`, error.statusCode)
    }
    const stripeMapped = mapStripeError(error)
    if (stripeMapped) {
      logger.warn(
        `Stripe rejected purchase checkout (${stripeMapped.code}): ${stripeMapped.message}`
      )
      return sendError(res, stripeMapped.message, stripeMapped.status, { code: stripeMapped.code })
    }
    logger.error('Create purchase error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to create purchase')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post(
  '/purchase',
  purchaseRateLimiter,
  authMiddleware,
  populateUserFromToken,
  checkPayDemoQuotas,
  createPurchaseHandler,
  {
    summary: 'Create a purchase checkout session',
    tags: ['Purchases'],
    bodySchema: createPurchaseSchema,
    responseSchema: paymentResponseSchema,
    status: 201,
  }
)

export { createPurchaseRegistry as registry, router }
export default router
