/**
 * Dunning service — orchestrates the three subscription billing emails
 * (`past_due`, `recovered`, `final_cancellation`) plus the matching
 * persistent UI notifications consumed by the SDK `<PastDueBanner>`.
 *
 * Triggered from the Stripe webhook handler in `routes/webhooks.ts`.
 * Centralised here so the webhook stays focused on Stripe-event mapping
 * and the email/notification side-effects can be tested in isolation.
 *
 * Naming follows Stripe's "dunning" terminology: the email cadence used
 * to recover failed payments before the subscription is finally cancelled.
 *
 * @module apps/ezpay/api/src/services/dunning.service
 */

import { logger } from '@ezstart/logger/server'
import { getWebUrl, type AppName } from '@ezstart/config'
import { formatCurrency } from '@ezstart/pay-sdk/core'
import { emailService } from './email.service.js'
import { auditLogService } from './audit-log.service.js'
import { getNotificationModel } from '../models/Notification.js'
import { subscriptionPastDueTemplate } from '../email/templates/subscription-past-due.js'
import { subscriptionRecoveredTemplate } from '../email/templates/subscription-recovered.js'
import { subscriptionFinalCancellationTemplate } from '../email/templates/subscription-final-cancellation.js'
import type { LocalEmailContext } from '../email/templates/shared.js'

/** Locale fallback when the consumer Application has no preference recorded. */
const DEFAULT_LOCALE: 'en' | 'fr' | 'vi' = 'en'

/** Best-effort duration estimate (informational, used in the email body). */
const SMART_RETRIES_NEXT_RETRY_DAYS = 3

interface DunningContext {
  /** Owner of the subscription (ezauth user id). */
  userId: string
  /** Application slug — used to resolve the consumer dashboard URL. */
  projectId: string
  /** Customer email captured at checkout (fallback recipient). */
  customerEmail?: string
  /** First name for personalisation. */
  customerName?: string
  /** Plan label (defaults to "your plan"). */
  planName?: string
  /** Stripe subscription id — included as audit metadata. */
  subscriptionId?: string
  /** Whether the originating event was on Stripe's live key. */
  isTestMode: boolean
}

interface PastDueArgs extends DunningContext {
  /** Failing invoice amount (in major units, already divided by 100). */
  amount: number
  /** ISO 4217 currency code. */
  currency: string
}

interface RecoveredArgs extends DunningContext {
  /** Recovered invoice amount (in major units). */
  amount: number
  /** ISO 4217 currency code. */
  currency: string
}

type FinalCancellationArgs = DunningContext

function resolveLocale(): 'en' | 'fr' | 'vi' {
  // The Application doesn't yet carry a locale preference — fallback to
  // the platform default. Future work: read from `Application.locale`
  // once that field exists (cf. EZAuth Application schema).
  return DEFAULT_LOCALE
}

function buildEmailContext(): LocalEmailContext {
  return {
    appName: 'EZPay',
    appKey: 'ezpay',
    locale: resolveLocale(),
  }
}

function buildBillingUrl(projectId: string): string {
  // Pull the consumer-facing web base URL for the originating Application.
  // Falls back to ezpay's own dashboard if the project is not mapped (e.g.
  // payments coming in via a publishable key for a slug we don't recognise).
  try {
    return `${getWebUrl(projectId as AppName)}/billing`
  } catch {
    return `${getWebUrl('ezpay')}/billing`
  }
}

function buildResubscribeUrl(projectId: string): string {
  try {
    return `${getWebUrl(projectId as AppName)}/pricing`
  } catch {
    return `${getWebUrl('ezpay')}/pricing`
  }
}

/**
 * Send the past-due dunning email AND drop a persistent banner notification
 * the SDK `<PastDueBanner>` will surface until `payment_recovery` resolves.
 *
 * Idempotency at the webhook layer (Stripe `event.id` dedup) is sufficient
 * — the underlying side-effects here (email send, notification insert,
 * audit log) are safe to repeat in the rare race-condition scenario.
 */
export async function handlePastDue(args: PastDueArgs): Promise<void> {
  const ctx = buildEmailContext()
  const planName = args.planName ?? 'your plan'
  const amountFormatted = formatCurrency(args.amount, args.currency.toUpperCase())
  const updatePaymentUrl = buildBillingUrl(args.projectId)

  // Audit first so the event is captured even if email fails.
  void auditLogService.create({
    userId: args.userId,
    action: 'subscription.past_due',
    metadata: {
      subscriptionId: args.subscriptionId,
      projectId: args.projectId,
      amount: args.amount,
      currency: args.currency,
    },
  })

  // Persistent notification — the SDK <PastDueBanner> reads this.
  try {
    const Notification = await getNotificationModel()
    await Notification.create({
      userId: args.userId,
      applicationId: args.projectId,
      type: 'past_due',
      severity: 'warning',
      message:
        'Your last payment failed. Update your payment method to avoid service interruption.',
      actionUrl: updatePaymentUrl,
      persistUntil: 'payment_recovery',
      isTestMode: args.isTestMode,
      metadata: {
        subscriptionId: args.subscriptionId,
        amount: args.amount,
        currency: args.currency,
      },
    })
  } catch (notifErr) {
    logger.warn(
      '[Dunning] Failed to persist past_due notification (non-fatal)',
      notifErr instanceof Error ? notifErr : String(notifErr)
    )
  }

  if (!args.customerEmail) {
    logger.warn(
      `[Dunning] past_due event for subscription ${args.subscriptionId ?? 'unknown'} has no customer email — skipping send`
    )
    return
  }

  const nextRetryAt = new Date(Date.now() + SMART_RETRIES_NEXT_RETRY_DAYS * 24 * 60 * 60 * 1000)
  const rendered = subscriptionPastDueTemplate(
    {
      userName: args.customerName,
      planName,
      amountFormatted,
      updatePaymentUrl,
      nextRetryAt,
    },
    ctx
  )

  try {
    await emailService.send({
      to: args.customerEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    })
    logger.info(
      `[Dunning] past_due email sent to ${args.customerEmail} (sub ${args.subscriptionId ?? 'unknown'})`
    )
  } catch (emailErr) {
    logger.error(
      '[Dunning] Failed to send past_due email',
      emailErr instanceof Error ? emailErr : String(emailErr)
    )
  }
}

/**
 * Confirm to the user that a previously-failed payment finally went
 * through. Cleans up the persistent banner so the dashboard stops
 * nagging them.
 */
export async function handleRecovered(args: RecoveredArgs): Promise<void> {
  const ctx = buildEmailContext()
  const planName = args.planName ?? 'your plan'
  const amountFormatted = formatCurrency(args.amount, args.currency.toUpperCase())
  const billingUrl = buildBillingUrl(args.projectId)

  void auditLogService.create({
    userId: args.userId,
    action: 'subscription.recovered',
    metadata: {
      subscriptionId: args.subscriptionId,
      projectId: args.projectId,
      amount: args.amount,
      currency: args.currency,
    },
  })

  // Drop ALL outstanding past_due banners for this user (any application
  // — recovery could resolve cross-app banners on the same userId).
  try {
    const Notification = await getNotificationModel()
    const result = await Notification.deleteMany({
      userId: args.userId,
      type: 'past_due',
      persistUntil: 'payment_recovery',
    })
    if (result.deletedCount > 0) {
      logger.info(
        `[Dunning] Cleared ${result.deletedCount} past_due notification(s) on recovery for user ${args.userId}`
      )
    }
  } catch (notifErr) {
    logger.warn(
      '[Dunning] Failed to clear past_due notifications on recovery (non-fatal)',
      notifErr instanceof Error ? notifErr : String(notifErr)
    )
  }

  if (!args.customerEmail) {
    logger.warn(
      `[Dunning] recovered event for subscription ${args.subscriptionId ?? 'unknown'} has no customer email — skipping send`
    )
    return
  }

  const rendered = subscriptionRecoveredTemplate(
    {
      userName: args.customerName,
      planName,
      amountFormatted,
      billingUrl,
    },
    ctx
  )

  try {
    await emailService.send({
      to: args.customerEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    })
    logger.info(
      `[Dunning] recovered email sent to ${args.customerEmail} (sub ${args.subscriptionId ?? 'unknown'})`
    )
  } catch (emailErr) {
    logger.error(
      '[Dunning] Failed to send recovered email',
      emailErr instanceof Error ? emailErr : String(emailErr)
    )
  }
}

/**
 * Final cancellation email — sent when Stripe gives up after exhausting
 * Smart Retries. Also writes a `subscription_cancelled` notification so
 * the dashboard surfaces a "subscription ended" banner with a re-subscribe
 * CTA (cleared by the consumer once they choose to resubscribe).
 */
export async function handleFinalCancellation(args: FinalCancellationArgs): Promise<void> {
  const ctx = buildEmailContext()
  const planName = args.planName ?? 'your plan'
  const resubscribeUrl = buildResubscribeUrl(args.projectId)

  // The cancellation itself is already logged by the existing
  // `subscription.canceled` audit entry in the webhook handler — no need
  // to double-log here. We only persist the notification + send the email.

  try {
    const Notification = await getNotificationModel()
    // Drop the past_due banner first (subscription is gone, that one is moot).
    await Notification.deleteMany({
      userId: args.userId,
      type: 'past_due',
      persistUntil: 'payment_recovery',
    })
    await Notification.create({
      userId: args.userId,
      applicationId: args.projectId,
      type: 'subscription_cancelled',
      severity: 'error',
      message: 'Your subscription was cancelled after several failed payment attempts.',
      actionUrl: resubscribeUrl,
      persistUntil: 'subscription_renewed',
      isTestMode: args.isTestMode,
      metadata: { subscriptionId: args.subscriptionId },
    })
  } catch (notifErr) {
    logger.warn(
      '[Dunning] Failed to persist subscription_cancelled notification (non-fatal)',
      notifErr instanceof Error ? notifErr : String(notifErr)
    )
  }

  if (!args.customerEmail) {
    logger.warn(
      `[Dunning] final_cancellation event for subscription ${args.subscriptionId ?? 'unknown'} has no customer email — skipping send`
    )
    return
  }

  const rendered = subscriptionFinalCancellationTemplate(
    {
      userName: args.customerName,
      planName,
      resubscribeUrl,
    },
    ctx
  )

  try {
    await emailService.send({
      to: args.customerEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    })
    logger.info(
      `[Dunning] final_cancellation email sent to ${args.customerEmail} (sub ${args.subscriptionId ?? 'unknown'})`
    )
  } catch (emailErr) {
    logger.error(
      '[Dunning] Failed to send final_cancellation email',
      emailErr instanceof Error ? emailErr : String(emailErr)
    )
  }
}
