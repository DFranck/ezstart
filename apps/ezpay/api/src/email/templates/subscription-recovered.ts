/**
 * Subscription recovery email — sent when an `invoice.payment_succeeded`
 * webhook fires AFTER a previous `past_due` state. Confirms to the user
 * that their payment went through and the subscription is back on track.
 *
 * Recovery detection happens in `routes/webhooks.ts` by comparing the
 * existing Payment row's status to the new event status.
 */

import {
  buildFooter,
  escapeHtml,
  htmlToText,
  renderLayout,
  type LocalEmailContext,
} from './shared.js'

export interface SubscriptionRecoveredData {
  /** First name fallback. */
  userName?: string
  /** Plan label (e.g. "Pro"). */
  planName: string
  /** Pre-formatted amount (locale-aware). */
  amountFormatted: string
  /** URL to the billing dashboard / receipt. */
  billingUrl: string
}

interface RenderedEmail {
  subject: string
  html: string
  text: string
}

const dict: Record<
  'en' | 'fr' | 'vi',
  {
    subject: string
    heading: string
    intro: string
    cta: string
    thanks: string
    greeting: string
  }
> = {
  en: {
    subject: 'Your payment was successful — thanks! ({appName})',
    heading: 'Payment recovered',
    intro:
      'Good news — your <strong>{planName}</strong> payment of <strong>{amount}</strong> went through. Your subscription is back on track.',
    cta: 'View billing details',
    thanks: 'Thank you for staying with us.',
    greeting: 'Hi {name},',
  },
  fr: {
    subject: 'Paiement effectué avec succès — merci ! ({appName})',
    heading: 'Paiement récupéré',
    intro:
      'Bonne nouvelle — votre paiement <strong>{planName}</strong> de <strong>{amount}</strong> est passé. Votre abonnement est de nouveau actif.',
    cta: 'Voir les détails de facturation',
    thanks: 'Merci de votre confiance.',
    greeting: 'Bonjour {name},',
  },
  vi: {
    subject: 'Thanh toán thành công — cảm ơn bạn! ({appName})',
    heading: 'Thanh toán đã được khôi phục',
    intro:
      'Tin tốt — khoản thanh toán <strong>{planName}</strong> trị giá <strong>{amount}</strong> đã thành công. Gói đăng ký của bạn đã hoạt động trở lại.',
    cta: 'Xem chi tiết thanh toán',
    thanks: 'Cảm ơn bạn đã tin tưởng chúng tôi.',
    greeting: 'Xin chào {name},',
  },
}

/**
 * Render the recovery confirmation email for a subscription whose
 * previously-failed payment finally succeeded.
 */
export function subscriptionRecoveredTemplate(
  data: SubscriptionRecoveredData,
  ctx: LocalEmailContext
): RenderedEmail {
  const section = dict[ctx.locale] ?? dict.en
  const subject = section.subject.replace('{appName}', ctx.appName)
  const heading = section.heading
  const intro = section.intro
    .replace('{planName}', escapeHtml(data.planName))
    .replace('{amount}', escapeHtml(data.amountFormatted))
  const greeting = section.greeting.replace('{name}', escapeHtml(data.userName ?? 'there'))

  const footer = buildFooter(ctx.appName, ctx.locale)

  const html = renderLayout({
    heading,
    bodyInnerHtml: `
      <p class="email-text">${greeting}</p>
      <h1 class="email-heading">${escapeHtml(heading)}</h1>
      <p class="email-text">${intro}</p>
      <p><a class="email-cta" href="${escapeHtml(data.billingUrl)}">${escapeHtml(section.cta)}</a></p>
      <p class="email-muted">${escapeHtml(section.thanks)}</p>
    `,
    appName: ctx.appName,
    appKey: ctx.appKey,
    footer,
  })

  const text = htmlToText(html) + `\n\n${data.billingUrl}\n`

  return { subject, html, text }
}
