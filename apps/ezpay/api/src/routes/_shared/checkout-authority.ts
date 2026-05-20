/**
 * Server-side checkout authority helpers — Wave E Lot 1A.
 *
 * Centralises the three security primitives that the checkout-create routes
 * (`POST /subscribe`, `POST /purchase`, `POST /donate`) share:
 *
 *   1. {@link assertApplicationAuthority} — tenant ownership gate. The
 *      `applicationId` a caller supplies in the request body is NOT trusted:
 *      we resolve it from the ezauth source-of-truth and verify the
 *      authenticated caller owns it (or is a superadmin). API-key auth is
 *      implicitly trusted because the key is bound to its Application at
 *      mint time. Anonymous donation flows fall back to an
 *      existence-and-active check (the donor is paying *to* the app, not
 *      acting *as* its owner).
 *
 *   2. {@link resolvePurchasePrice} — price authority for one-time
 *      purchases. The amount is resolved from the server-side product
 *      catalogue keyed by `productId`; any client-supplied `amount` /
 *      `currency` is ignored. Prevents the €49 → €0.01 tampering PoC.
 *
 *   3. {@link validateDonationAmount} — bounded validation for donor-chosen
 *      donation amounts. Donations legitimately let the donor pick the
 *      amount, so we cannot hardcode it — but we clamp it to a server
 *      currency allowlist and a sane min/max, rejecting negative / zero /
 *      NaN / overflow values.
 *
 * Subscriptions resolve their price from the linked `Plan.stripePriceId` /
 * `Plan.amount` directly in the route handler (mirrors the pattern in
 * `subscriptions/change-plan.ts`), so there is no subscription-specific
 * helper here.
 *
 * @module apps/ezpay/api/src/routes/_shared/checkout-authority
 */

import type { Request } from 'express'
import { isAdminUser } from '../../middleware/auth.js'
import { getApplication } from '../../services/ezauth-client.js'
import { TEST_PRODUCTS } from '../../config/test-products.js'

/**
 * Extract a Bearer JWT from the request — Authorization header first, then
 * the legacy `ezauth_token` cookie. Forwarded to ezauth so its JWT-based
 * ownership check runs server-to-server.
 *
 * @internal
 */
export function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  const cookieHeader = req.headers.cookie || ''
  return cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('ezauth_token='))
    ?.split('=')[1]
}

/** Discriminated outcome of {@link assertApplicationAuthority}. */
export type ApplicationAuthorityResult =
  | { ok: true; applicationId: string }
  | { ok: false; status: 400 | 403 | 404; message: string }

/** Options for {@link assertApplicationAuthority}. */
export interface AssertApplicationAuthorityOptions {
  /**
   * When `true` (donation flow), an anonymous caller (no `req.userId`, no
   * API key) is permitted: the Application is validated for existence /
   * active status only — there is no caller identity to own it. When
   * `false` (subscribe / purchase), an anonymous caller cannot proceed
   * because the route requires authentication upstream.
   */
  allowAnonymous?: boolean
}

/**
 * Resolve + authorise the target Application for a checkout.
 *
 * Resolution priority for the Application id:
 *   1. API-key auth → `req.apiKeyApplicationId` (bound at mint time, trusted)
 *   2. Bearer/JWT auth or anonymous → caller-supplied `bodyApplicationId`
 *
 * Authorisation rules:
 *   - API-key path: implicitly authorised (the key proves the binding).
 *   - Authenticated Bearer path: the Application must exist, be `active`,
 *     and be owned by `req.userId` (or the caller must be a superadmin),
 *     verified against the ezauth source-of-truth. Otherwise 403 / 404 /
 *     400.
 *   - Anonymous donation path (`allowAnonymous: true`): the Application
 *     must exist and be `active`; no ownership is required (the donor pays
 *     *to* the app).
 *
 * Returns the resolved `applicationId` on success, or a structured error
 * the route maps onto `sendError(res, message, status)`.
 *
 * @example
 * const authz = await assertApplicationAuthority(req, bodyApplicationId)
 * if (!authz.ok) return sendError(res, authz.message, authz.status)
 * const applicationId = authz.applicationId
 */
export async function assertApplicationAuthority(
  req: Request,
  bodyApplicationId: string | undefined,
  opts: AssertApplicationAuthorityOptions = {}
): Promise<ApplicationAuthorityResult> {
  // 1. API-key auth — the key is bound to its Application at creation, so the
  //    binding is the authorisation. Trust `req.apiKeyApplicationId` over any
  //    body-supplied id (a key can NEVER act on another tenant).
  const apiKeyApplicationId = req.apiKeyApplicationId
  if (apiKeyApplicationId) {
    return { ok: true, applicationId: apiKeyApplicationId }
  }

  if (!bodyApplicationId) {
    return {
      ok: false,
      status: 400,
      message:
        'applicationId is required when not authenticated via API key (body field or X-API-Key)',
    }
  }

  const userId = req.userId

  // 2. Anonymous donation flow — no caller identity to own the Application.
  //    Validate existence + active status so payments aren't created against
  //    arbitrary / garbage ids, but skip the ownership gate.
  if (!userId) {
    if (!opts.allowAnonymous) {
      return { ok: false, status: 403, message: 'Authentication required' }
    }
    const application = await getApplication(bodyApplicationId, {})
    if (!application) {
      return { ok: false, status: 404, message: 'Application not found' }
    }
    if (application.status !== 'active') {
      return { ok: false, status: 400, message: 'Application is archived' }
    }
    return { ok: true, applicationId: bodyApplicationId }
  }

  // 3. Authenticated Bearer flow — enforce owner / superadmin against the
  //    ezauth source-of-truth. The caller's Bearer is forwarded so ezauth's
  //    own ownership check runs.
  const bearerToken = extractBearerToken(req)
  const application = await getApplication(bodyApplicationId, { bearerToken })
  if (!application) {
    return { ok: false, status: 404, message: 'Application not found' }
  }
  if (application.status !== 'active') {
    return { ok: false, status: 400, message: 'Application is archived' }
  }
  if (application.ownerId !== userId && !isAdminUser(req)) {
    return { ok: false, status: 403, message: 'Not allowed to checkout for this Application' }
  }

  return { ok: true, applicationId: bodyApplicationId }
}

/** A resolved, server-authoritative product price. */
export interface ResolvedProductPrice {
  productId: string
  productName: string
  /** Price in major currency units (e.g. `9.99`), ready for the provider. */
  amount: number
  /** ISO 4217 currency code, lower-cased (matches the catalogue). */
  currency: string
}

/**
 * Resolve a one-time purchase price from the server-side product catalogue,
 * keyed by `productId`. The client-supplied `amount` / `currency` are
 * deliberately ignored — the price is whatever the catalogue says.
 *
 * `TEST_PRODUCTS.purchases[].amount` is stored in **cents** (e.g. `999`),
 * while the payment provider expects **major units** (it multiplies by 100
 * internally). We divide by 100 here so the provider charges the correct
 * amount.
 *
 * @returns the resolved price, or `null` when `productId` is unknown (the
 * route maps `null` onto a 400).
 *
 * @example
 * const price = resolvePurchasePrice('ezpay-test-item')
 * if (!price) return sendError(res, 'Unknown productId', 400)
 * // price.amount === 9.99
 */
export function resolvePurchasePrice(productId: string): ResolvedProductPrice | null {
  const product = TEST_PRODUCTS.purchases.find(p => p.productId === productId)
  if (!product) return null
  return {
    productId: product.productId,
    productName: product.productName,
    amount: product.amount / 100,
    currency: product.currency,
  }
}

/**
 * Server-side currency allowlist for donor-chosen donation amounts. A
 * tampered request asking for an exotic currency is rejected rather than
 * forwarded to Stripe verbatim.
 */
export const DONATION_CURRENCY_ALLOWLIST = ['eur', 'usd', 'gbp'] as const

/** Minimum chargeable donation in major units (Stripe rejects sub-€0.50). */
export const DONATION_MIN_AMOUNT = 1
/** Maximum donation in major units — sanity ceiling against overflow / typos. */
export const DONATION_MAX_AMOUNT = 10_000

/** Discriminated outcome of {@link validateDonationAmount}. */
export type DonationAmountResult =
  | { ok: true; amount: number; currency: string }
  | { ok: false; message: string }

/**
 * Validate a donor-chosen donation amount + currency server-side. The
 * amount stays client-controlled (a donation is by definition a chosen
 * amount) but is bounded and sanity-checked:
 *   - finite, not NaN / Infinity
 *   - strictly positive (the €0 testimonial path is handled separately
 *     before this is called)
 *   - within `[DONATION_MIN_AMOUNT, DONATION_MAX_AMOUNT]`
 *   - currency in {@link DONATION_CURRENCY_ALLOWLIST} (case-insensitive)
 *
 * @returns the validated `{ amount, currency }` (currency normalised to
 * lower-case) or a structured error message.
 *
 * @example
 * const v = validateDonationAmount(25, 'EUR')
 * if (!v.ok) return sendValidationError(res, v.message, [...])
 */
export function validateDonationAmount(amount: number, currency: string): DonationAmountResult {
  if (!Number.isFinite(amount)) {
    return { ok: false, message: 'amount must be a finite number' }
  }
  if (amount <= 0) {
    return { ok: false, message: 'amount must be greater than zero' }
  }
  if (amount < DONATION_MIN_AMOUNT) {
    return { ok: false, message: `amount must be at least ${DONATION_MIN_AMOUNT}` }
  }
  if (amount > DONATION_MAX_AMOUNT) {
    return { ok: false, message: `amount must not exceed ${DONATION_MAX_AMOUNT}` }
  }

  const normalisedCurrency = currency.toLowerCase()
  if (
    !DONATION_CURRENCY_ALLOWLIST.includes(
      normalisedCurrency as (typeof DONATION_CURRENCY_ALLOWLIST)[number]
    )
  ) {
    return {
      ok: false,
      message: `currency must be one of: ${DONATION_CURRENCY_ALLOWLIST.join(', ').toUpperCase()}`,
    }
  }

  return { ok: true, amount, currency: normalisedCurrency }
}
