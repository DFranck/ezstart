/**
 * Subscription past_due dunning email — sent when Stripe transitions a
 * subscription to `past_due` (card declined / expired / insufficient funds).
 *
 * Pairs with Stripe Smart Retries (configured in Dashboard, see
 * `apps/ezpay/STRIPE_DUNNING_SETUP.md`). Stripe will retry payments
 * automatically for ~22 days; the operator owns the messaging cadence
 * here. Idempotency at the webhook layer prevents double-sending on Stripe
 * redelivery: `routes/webhooks.ts` claims each `event.id` in the
 * `WebhookEvent` ledger (atomic, unique index) before this template is
 * ever rendered, so a redelivered event is a 200 no-op.
 */

import {
  buildFooter,
  escapeHtml,
  htmlToText,
  renderLayout,
  type LocalEmailContext,
} from './shared.js'

export interface SubscriptionPastDueData {
  /** First name fallback (defaults to a generic greeting if absent). */
  userName?: string
  /** Plan label (e.g. "Pro", "Team"). */
  planName: string
  /** Pre-formatted amount (already locale-aware). */
  amountFormatted: string
  /** URL to the consumer's billing page (Stripe Customer Portal entry). */
  updatePaymentUrl: string
  /** Approximate next retry date (Stripe Smart Retries — informational). */
  nextRetryAt?: Date
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
    warning: string
    intro: string
    cta: string
    nextRetry: string
    consequence: string
    help: string
    greeting: string
  }
> = {
  en: {
    subject: 'Action required — your last payment failed ({appName})',
    heading: 'We could not process your last payment',
    warning:
      'Your last <strong>{planName}</strong> payment of <strong>{amount}</strong> was declined.',
    intro:
      'No worries — your subscription is still active for now. Update your payment method to avoid any interruption:',
    cta: 'Update payment method',
    nextRetry: 'We will automatically retry around {date}.',
    consequence:
      'After 4 failed retries (about 22 days), your subscription will be marked unpaid and access to paid features will be suspended.',
    help: 'If you need help, reply to this email and our team will get back to you.',
    greeting: 'Hi {name},',
  },
  fr: {
    subject: 'Action requise — votre dernier paiement a échoué ({appName})',
    heading: "Nous n'avons pas pu traiter votre dernier paiement",
    warning:
      'Votre dernier paiement <strong>{planName}</strong> de <strong>{amount}</strong> a été refusé.',
    intro:
      "Pas de panique — votre abonnement est toujours actif pour l'instant. Mettez à jour votre moyen de paiement pour éviter toute interruption :",
    cta: 'Mettre à jour le paiement',
    nextRetry: 'Nous réessaierons automatiquement vers le {date}.',
    consequence:
      "Après 4 tentatives échouées (environ 22 jours), votre abonnement sera marqué impayé et l'accès aux fonctionnalités payantes sera suspendu.",
    help: "Si vous avez besoin d'aide, répondez à cet e-mail et notre équipe vous recontactera.",
    greeting: 'Bonjour {name},',
  },
  vi: {
    subject: 'Cần xử lý — thanh toán gần nhất thất bại ({appName})',
    heading: 'Chúng tôi không thể xử lý khoản thanh toán gần nhất',
    warning:
      'Khoản thanh toán <strong>{planName}</strong> trị giá <strong>{amount}</strong> đã bị từ chối.',
    intro:
      'Đừng lo — gói đăng ký của bạn vẫn đang hoạt động. Hãy cập nhật phương thức thanh toán để tránh gián đoạn:',
    cta: 'Cập nhật phương thức thanh toán',
    nextRetry: 'Chúng tôi sẽ tự động thử lại vào khoảng {date}.',
    consequence:
      'Sau 4 lần thử thất bại (khoảng 22 ngày), gói đăng ký sẽ được đánh dấu chưa thanh toán và quyền truy cập tính năng trả phí sẽ bị tạm dừng.',
    help: 'Nếu cần hỗ trợ, vui lòng trả lời email này và đội ngũ của chúng tôi sẽ liên hệ lại.',
    greeting: 'Xin chào {name},',
  },
}

function formatDate(date: Date | undefined, locale: 'en' | 'fr' | 'vi'): string | null {
  if (!date) return null
  const intlLocale = locale === 'fr' ? 'fr-FR' : locale === 'vi' ? 'vi-VN' : 'en-US'
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: 'long' }).format(date)
}

/**
 * Render the past_due dunning email for a subscription whose last invoice
 * payment failed. Triggered from the `customer.subscription.past_due`
 * Stripe webhook handler in `apps/ezpay/api/src/routes/webhooks.ts`.
 */
export function subscriptionPastDueTemplate(
  data: SubscriptionPastDueData,
  ctx: LocalEmailContext
): RenderedEmail {
  const section = dict[ctx.locale] ?? dict.en
  const subject = section.subject.replace('{appName}', ctx.appName)
  const heading = section.heading
  const warning = section.warning
    .replace('{planName}', escapeHtml(data.planName))
    .replace('{amount}', escapeHtml(data.amountFormatted))
  const greeting = section.greeting.replace('{name}', escapeHtml(data.userName ?? 'there'))

  const retryDateStr = formatDate(data.nextRetryAt, ctx.locale)
  const retryLine = retryDateStr
    ? `<p class="email-muted">${escapeHtml(section.nextRetry.replace('{date}', retryDateStr))}</p>`
    : ''

  const footer = buildFooter(ctx.appName, ctx.locale)

  const html = renderLayout({
    heading,
    bodyInnerHtml: `
      <p class="email-text">${greeting}</p>
      <h1 class="email-heading">${escapeHtml(heading)}</h1>
      <div class="email-warning">${warning}</div>
      <p class="email-text">${escapeHtml(section.intro)}</p>
      <p><a class="email-cta" href="${escapeHtml(data.updatePaymentUrl)}">${escapeHtml(section.cta)}</a></p>
      ${retryLine}
      <p class="email-muted">${escapeHtml(section.consequence)}</p>
      <p class="email-muted">${escapeHtml(section.help)}</p>
    `,
    appName: ctx.appName,
    appKey: ctx.appKey,
    footer,
  })

  const text = htmlToText(html) + `\n\n${data.updatePaymentUrl}\n`

  return { subject, html, text }
}
