'use client'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Icon,
  Div,
} from '@ezstart/ui/components'
import { useSubscriptions } from '../react/hooks/useSubscriptions.js'
import { formatCurrency } from '../core/format-currency.js'
import type { Payment } from '../core/types.js'

export interface PastDueBannerTexts {
  /** Card title (defaults: `'Payment failed'`). */
  title: string
  /**
   * Card description body. Supports two placeholders that are substituted at
   * render time:
   * - `{plan}` — plan label (e.g. `"Pro"`).
   * - `{amount}` — pre-formatted currency amount.
   */
  description: string
  /** CTA button label (defaults: `'Update payment method'`). */
  cta: string
  /** Sub-line above the description for context (optional). */
  subtitle?: string
}

const DEFAULT_TEXTS: PastDueBannerTexts = {
  title: 'Payment failed',
  description:
    'Your last {plan} payment of {amount} could not be processed. Update your payment method to keep your subscription active.',
  cta: 'Update payment method',
}

export interface PastDueBannerProps {
  /**
   * The user whose subscriptions to inspect. Defaults to the authenticated
   * user via `useSubscriptions({ userId })` — pass `userId` explicitly when
   * the parent already has it (saves a round-trip auth check).
   */
  userId?: string
  /**
   * Click handler for the CTA. If omitted, the button is rendered as an
   * anchor pointing to `actionHref` instead. One of the two MUST be set
   * — otherwise the button is disabled.
   */
  onUpdatePayment?: () => void
  /**
   * Fallback href when `onUpdatePayment` is not provided. Useful when the
   * banner is rendered in a server component context where the click
   * handler is unavailable.
   */
  actionHref?: string
  /** Override the default English texts. */
  texts?: Partial<PastDueBannerTexts>
  /** Optional className to merge with the outer Card. */
  className?: string
}

function isPastDue(payment: Payment): boolean {
  if (payment.type !== 'subscription') return false
  const subStatus = (payment.metadata as { subscriptionStatus?: string } | undefined)
    ?.subscriptionStatus
  return subStatus === 'past_due' || subStatus === 'unpaid'
}

/**
 * Persistent banner shown when ANY of the user's subscriptions is in
 * `past_due` (Stripe terminology — last invoice payment failed and Smart
 * Retries are in progress). Returns `null` when no subscription is in
 * dunning state.
 *
 * Pairs with the EZPay backend dunning service — when Stripe transitions
 * the subscription back to `active` after a successful retry, the next
 * `useSubscriptions()` poll (or React Query revalidation) will see the
 * updated status and the banner unmounts on its own.
 *
 * @example
 * ```tsx
 * <PastDueBanner
 *   userId={user.id}
 *   onUpdatePayment={() => router.push('/billing?action=update-payment')}
 * />
 * ```
 *
 * @example with `<ManageSubscriptionButton>`:
 * ```tsx
 * <PastDueBanner userId={user.id} actionHref="/billing" />
 * ```
 */
export function PastDueBanner({
  userId,
  onUpdatePayment,
  actionHref,
  texts: textsProp,
  className,
}: PastDueBannerProps) {
  const t = { ...DEFAULT_TEXTS, ...textsProp }
  const { subscriptions, isLoading } = useSubscriptions({ userId, autoLoad: true })

  if (isLoading) return null

  const overdue = subscriptions.find(isPastDue)
  if (!overdue) return null

  const planName =
    (overdue.metadata as { planName?: string } | undefined)?.planName ?? 'subscription'
  const amount = formatCurrency(overdue.amount, overdue.currency.toUpperCase())
  const description = t.description.replace('{plan}', planName).replace('{amount}', amount)

  const handleClick = () => {
    if (onUpdatePayment) onUpdatePayment()
  }

  const ctaButton = onUpdatePayment ? (
    <Button variant="destructive" onClick={handleClick}>
      {t.cta}
    </Button>
  ) : actionHref ? (
    <Button asChild variant="destructive">
      <a href={actionHref}>{t.cta}</a>
    </Button>
  ) : (
    <Button variant="destructive" disabled>
      {t.cta}
    </Button>
  )

  return (
    <Card intent="destructive" className={className}>
      <CardHeader>
        <Div className="flex items-center gap-2">
          <Icon name="lucide:CreditCard" className="h-5 w-5 text-destructive" aria-hidden="true" />
          <CardTitle>{t.title}</CardTitle>
        </Div>
        {t.subtitle ? <CardDescription>{t.subtitle}</CardDescription> : null}
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{ctaButton}</CardContent>
    </Card>
  )
}
