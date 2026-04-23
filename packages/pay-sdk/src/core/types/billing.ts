// Billing Portal (Stripe Customer Portal)

/**
 * Response payload returned by `POST /api/billing/portal`.
 *
 * The `url` is a short-lived Stripe-hosted portal URL — redirect the user
 * there (e.g. `window.location.href = url`).
 */
export interface BillingPortalResponse {
  url: string
}

/**
 * Body accepted by `POST /api/billing/portal`. When `customerId` is omitted,
 * the route resolves the customer from the authenticated user's most recent
 * subscription.
 */
export interface BillingPortalRequest {
  /** URL the customer is redirected to after leaving the portal. */
  returnUrl?: string
  /** Explicit Stripe customer id — skips auto-resolution from subscriptions. */
  customerId?: string
}
