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
import { URLS, getWebUrl, type AppName } from '@ezstart/config'
import { getPaymentModel } from '../../models/Payment.js'
import {
  getProviderForRequest,
  resolveRequestMode,
  isStripeModeUnavailableError,
} from '../../services/stripe.js'
import { resolveConnectFee } from '../../services/connect-fee.js'
import { mapStripeError } from '../../utils/stripe-error.js'
import { authOptionalJwtOrKey } from '../../middleware/unified-auth.js'
import { checkPayDemoQuotas } from '../../middleware/check-pay-demo-quotas.js'
import {
  assertApplicationAuthority,
  validateDonationAmount,
} from '../_shared/checkout-authority.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

// Strict per-bucket rate limit (anti card-testing / abuse). Donations accept
// anonymous callers, so the bucket falls back to per-IP for them. See
// `createStrictRateLimiter` (5 req / min). Disabled under NODE_ENV=test.
const donateRateLimiter = createStrictRateLimiter({
  disabled: process.env.NODE_ENV === 'test',
})

/**
 * Resolve the base URL for Stripe Checkout success / cancel redirects.
 *
 * Priority:
 *  1. Caller-provided `returnUrl` (explicit override — full URL, no
 *     transformation)
 *  2. `getWebUrl(projectId)` when `projectId` is a known platform `AppName`
 *     (the standard case — EZBill, FengShui, GreenPulse, etc. use their
 *     own slug as `projectId`)
 *  3. Request `Origin` header — fallback for sandbox / docs demo /
 *     external consumers whose `projectId` is not a platform AppName
 *     (e.g. `_pay-docs-demo` for the live previews on /docs/components)
 *
 * @returns the resolved absolute URL, or `null` when no signal is
 * available (caller should 422 with a clear message).
 */
function resolveDonationBaseUrl(
  returnUrl: string | undefined,
  projectId: string,
  req: Request
): string | null {
  if (returnUrl) return returnUrl
  if (Object.prototype.hasOwnProperty.call(URLS, projectId)) {
    return getWebUrl(projectId as AppName)
  }
  const origin = req.headers.origin
  if (typeof origin === 'string' && origin.length > 0) {
    return origin
  }
  return null
}

export const createDonationRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createDonationRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const createDonationSchema = z.object({
  projectId: z.string().max(100).describe('Project identifier'),
  applicationId: z
    .string()
    .optional()
    .describe(
      'ezauth Application id receiving the donation (required when not authenticated via API key)'
    ),
  projectName: z.string().optional().describe('Project display name'),
  amount: z
    .number()
    .finite('amount must be a finite number')
    .nonnegative()
    .describe('Donation amount in currency units (0 = testimonial). Bounded server-side.'),
  currency: z
    .string()
    .regex(/^[a-z]{3}$/i, 'Must be a valid ISO 4217 currency code')
    .default('EUR')
    .describe('Currency code (EUR, USD, GBP, etc.)'),
  message: z.string().optional().describe('Optional message from donor'),
  isPublic: z.boolean().default(true).describe('Whether donation is shown publicly'),
  isAnonymous: z.boolean().default(false).describe('Whether donor wants to stay anonymous'),
  donorName: z.string().optional().describe('Donor name'),
  donorEmail: z.string().email().optional().describe('Donor email'),
  returnUrl: z.string().url().optional().describe('Custom return URL after payment'),
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

const createDonationHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const validation = createDonationSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid donation data', validation.error.errors)
    }

    const {
      projectId,
      applicationId: bodyApplicationId,
      projectName,
      amount,
      currency = 'EUR',
      message,
      isPublic = true,
      isAnonymous = false,
      donorName,
      donorEmail,
      returnUrl,
    } = validation.data

    // Use the authenticated user ID from JWT if available, never from the request body
    const userId = req.userId

    // Test/live partition is driven by the CALLER's key (`req.derivedMode`),
    // never by the process env prefix (Wave E MED-2). Applies to BOTH the
    // testimonial (€0, no Stripe) and the Stripe-backed donation path so a
    // test key never writes a live-tagged donation row.
    const mode = resolveRequestMode(req)
    const isTestMode = mode === 'test'

    // Testimonial: bypass Stripe for €0 donations, save directly to DB
    if (amount === 0) {
      const payment = await Payment.create({
        projectId,
        projectName: projectName || projectId,
        type: 'testimonial',
        amount: 0,
        currency: currency || 'USD',
        provider: 'stripe',
        paymentId: `testimonial-${Date.now()}`,
        status: 'completed',
        completedAt: new Date(),
        userId: userId || undefined,
        customerName: donorName || undefined,
        customerEmail: donorEmail || undefined,
        isAnonymous: isAnonymous || false,
        liveMode: !isTestMode,
        isTestMode,
        metadata: {
          message: message || undefined,
          isPublic: isPublic !== false,
        },
      })

      logger.info(`💬 Testimonial created - ID: ${payment._id}`)

      return sendSuccess(res, {
        payment: { id: payment._id, ...payment.toObject() },
        checkoutUrl: null,
      })
    }

    // Amount authority (C-1, donation variant) — a donation amount is
    // donor-chosen (legitimate), but we bound + validate it server-side:
    // reject negative / zero / NaN / overflow and clamp the currency to a
    // server allowlist. The donor still picks the amount, but never an
    // out-of-range one or an exotic currency forwarded to Stripe verbatim.
    const amountCheck = validateDonationAmount(amount, currency)
    if (!amountCheck.ok) {
      return sendValidationError(res, amountCheck.message, [
        {
          code: 'custom',
          path: ['amount'],
          message: amountCheck.message,
        },
      ])
    }
    const validatedAmount = amountCheck.amount
    const validatedCurrency = amountCheck.currency

    // Use custom returnUrl, fallback to project's web URL based on projectId,
    // then to the request `Origin` header (sandbox / docs demo / external
    // consumers whose `projectId` is not a known platform AppName).
    const baseUrl = resolveDonationBaseUrl(returnUrl, projectId, req)
    if (!baseUrl) {
      return sendValidationError(res, 'Cannot resolve return URL', [
        {
          code: 'custom',
          path: ['returnUrl'],
          message:
            'returnUrl is required when projectId is not a known platform app and the request carries no Origin header',
        },
      ])
    }

    // Tenant gate (C-3, donation variant) — resolve + authorise the target
    // Application. API-key auth is trusted (bound at mint time); an
    // authenticated Bearer caller must own the Application or be superadmin;
    // an anonymous donor may donate *to* an existing + active Application
    // (no ownership required — they pay to the app, not as it).
    const authz = await assertApplicationAuthority(req, bodyApplicationId, { allowAnonymous: true })
    if (!authz.ok) {
      return sendError(res, authz.message, authz.status)
    }
    const applicationId = authz.applicationId

    // Resolve Connect fee for the target Application
    const connectFee = await resolveConnectFee(applicationId, Math.round(validatedAmount * 100))

    // Stripe automatic tax — opt-out via env var. See subscribe route for details.
    const automaticTax = process.env.STRIPE_AUTOMATIC_TAX !== 'false'

    // Create checkout session via the provider for the caller's derived mode.
    // Fail-closed when the mode's key is missing — see services/stripe.ts.
    const provider = getProviderForRequest(req)
    const session = await provider.createCheckoutSession({
      amount: validatedAmount,
      currency: validatedCurrency,
      description: `Donation to ${projectName || projectId}`,
      metadata: {
        type: 'donation',
        projectId,
        projectName: projectName || projectId,
        userId: userId || '',
        message: message || '',
        isPublic: isPublic.toString(),
        isAnonymous: isAnonymous.toString(),
      },
      successUrl: `${baseUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/donate/cancel`,
      automaticTax,
      connect:
        connectFee.isConnect && connectFee.stripeAccountId
          ? {
              destinationAccountId: connectFee.stripeAccountId,
              // One-shots use cents-based fee
              applicationFeeAmount: connectFee.applicationFeeAmount,
            }
          : undefined,
    })

    // Create payment record in DB
    const payment = await Payment.create({
      projectId,
      projectName: projectName || projectId,
      type: 'donation',
      amount: validatedAmount,
      currency: validatedCurrency,
      userId,
      customerName: isAnonymous ? 'Anonymous' : donorName,
      customerEmail: donorEmail,
      isAnonymous,
      provider: 'stripe',
      paymentId: session.sessionId,
      status: 'pending',
      liveMode: !isTestMode,
      isTestMode,
      metadata: {
        message,
        isPublic,
      },
    })

    logger.info(`💳 Donation created - Session ID: ${session.sessionId}`)
    logger.info(`🔗 Checkout URL: ${session.url}`)

    sendSuccess(res, { payment, checkoutUrl: session.url })
  } catch (error) {
    // Fail-closed: the caller's mode has no Stripe key — 503, never downgrade.
    if (isStripeModeUnavailableError(error)) {
      logger.error(`Donation checkout refused — ${error.message}`)
      return sendError(res, `Payments are not available in ${error.mode} mode`, error.statusCode)
    }
    const stripeMapped = mapStripeError(error)
    if (stripeMapped) {
      logger.warn(
        `Stripe rejected donation checkout (${stripeMapped.code}): ${stripeMapped.message}`
      )
      return sendError(res, stripeMapped.message, stripeMapped.status, { code: stripeMapped.code })
    }
    logger.error('Create donation error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to create donation')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post(
  '/donate',
  donateRateLimiter,
  authOptionalJwtOrKey(),
  checkPayDemoQuotas,
  createDonationHandler,
  {
    summary: 'Create a donation checkout session',
    tags: ['Donations'],
    bodySchema: createDonationSchema,
    responseSchema: paymentResponseSchema,
    status: 201,
  }
)

export { createDonationRegistry as registry, router }
export default router
