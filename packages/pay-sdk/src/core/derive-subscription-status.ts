/**
 * Pure derivation of a {@link SubscriptionStatusSnapshot} from a list of
 * payment records (+ optional plan list for feature resolution).
 *
 * Shared between the client `useSubscriptionStatus` hook and the server
 * `getServerSubscriptionStatus` companion so both produce a byte-identical
 * snapshot — no flash when the client hydrates from the SSR `initialStatus`
 * and then revalidates.
 *
 * Agnostic: zero React, zero browser, zero `@ezstart/*`.
 */

import type { Payment } from './types/payments.js'
import type { Plan } from './types/plans.js'
import type { SubscriptionStatusSnapshot } from './types/billing.js'

/** Empty (not-subscribed) snapshot — the default for anonymous / free users. */
export const EMPTY_SUBSCRIPTION_SNAPSHOT: SubscriptionStatusSnapshot = {
  isActive: false,
  isTrialing: false,
  isCanceling: false,
  plan: null,
  features: [],
  periodEnd: null,
  subscription: null,
}

/**
 * Find the active subscription in a payment list and derive its status.
 *
 * @param payments - Recent payment records (typically `limit=1` ordered by
 *   recency, but a longer list works — the first `completed` subscription
 *   wins).
 * @param plans - Optional plan list used to resolve `features` when the
 *   subscription metadata snapshot is empty. Pass `undefined` to skip the
 *   lookup (metadata features only).
 * @returns A serializable snapshot. Returns {@link EMPTY_SUBSCRIPTION_SNAPSHOT}
 *   when no active subscription is found.
 */
export function deriveSubscriptionStatus(
  payments: Payment[],
  plans?: Plan[]
): SubscriptionStatusSnapshot {
  const activeSub = payments.find(p => p.status === 'completed' && p.type === 'subscription')

  if (!activeSub) return EMPTY_SUBSCRIPTION_SNAPSHOT

  // Priority: snapshot from payment metadata > current plan feature list.
  let features: string[] = (activeSub.metadata?.features as string[]) || []
  if (features.length === 0 && plans && plans.length > 0) {
    const planName = activeSub.metadata?.planName
    const plan = plans.find(p => p.name === planName)
    features = plan?.features || []
  }

  const subStatus = activeSub.metadata?.subscriptionStatus as string | undefined

  return {
    isActive: true,
    isTrialing: subStatus === 'trialing',
    isCanceling: activeSub.cancelAtPeriodEnd || false,
    plan: (activeSub.metadata?.planName as string) || null,
    features,
    periodEnd: activeSub.currentPeriodEnd ?? null,
    subscription: activeSub,
  }
}
