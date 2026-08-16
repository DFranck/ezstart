// Billing Portal (Stripe Customer Portal)

import type { Payment } from './payments.js'

/**
 * Serializable snapshot of a user's subscription status.
 *
 * This is the SSR-friendly shape shared between {@link getServerSubscriptionStatus}
 * (server companion) and `useSubscriptionStatus` (client hook). Unlike the
 * hook's runtime output, `periodEnd` is an ISO-8601 string (not a `Date`) so
 * it crosses the RSC → Client Component boundary without serialization loss.
 *
 * Pass it as `initialSubscription` on `<BillingDashboard>` / `<PricingPage>`
 * to render the correct billing state on the very first paint (no skeleton
 * flash). The client hook hydrates from this snapshot and revalidates from
 * the server post-hydration.
 */
export interface SubscriptionStatusSnapshot {
  /** Has an active subscription. */
  isActive: boolean
  /** Subscription is in a free trial period. */
  isTrialing: boolean
  /** Cancel requested but still active until period end. */
  isCanceling: boolean
  /** Plan name from subscription metadata, or `null` when not subscribed. */
  plan: string | null
  /** Features from the matched plan (or the subscription metadata snapshot). */
  features: string[]
  /** ISO-8601 string for when the current billing period ends, or `null`. */
  periodEnd: string | null
  /** The raw subscription payment record, or `null` when not subscribed. */
  subscription: Payment | null
}

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
