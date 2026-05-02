/**
 * Subscription final cancellation email — sent when Stripe gives up after
 * exhausting Smart Retries (subscription transitions to `canceled` after
 * being `past_due` for ~22 days). Last-chance UX: still offer the user
 * a way to re-subscribe rather than just announcing the bad news.
 */

import {
  buildFooter,
  escapeHtml,
  htmlToText,
  renderLayout,
  type LocalEmailContext,
} from './shared.js'

export interface SubscriptionFinalCancellationData {
  /** First name fallback. */
  userName?: string
  /** Plan label that just got cancelled. */
  planName: string
  /** URL to the pricing / re-subscribe page. */
  resubscribeUrl: string
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
    miss: string
    greeting: string
  }
> = {
  en: {
    subject: 'Your {appName} subscription has been cancelled',
    heading: 'Your subscription was cancelled',
    intro:
      'After several failed payment attempts on your <strong>{planName}</strong> subscription, we had to cancel it. Paid features are no longer available on your account.',
    cta: 'Re-subscribe',
    miss: 'We hate to see you go. If this was unintentional, you can re-subscribe at any time and pick up right where you left off.',
    greeting: 'Hi {name},',
  },
  fr: {
    subject: 'Votre abonnement {appName} a été annulé',
    heading: 'Votre abonnement a été annulé',
    intro:
      "Après plusieurs tentatives de paiement infructueuses sur votre abonnement <strong>{planName}</strong>, nous avons dû l'annuler. Les fonctionnalités payantes ne sont plus disponibles sur votre compte.",
    cta: 'Se réabonner',
    miss: "Nous sommes désolés de vous voir partir. Si c'est involontaire, vous pouvez vous réabonner à tout moment et reprendre exactement là où vous en étiez.",
    greeting: 'Bonjour {name},',
  },
  vi: {
    subject: 'Gói đăng ký {appName} của bạn đã bị huỷ',
    heading: 'Gói đăng ký của bạn đã bị huỷ',
    intro:
      'Sau nhiều lần thử thanh toán không thành công cho gói <strong>{planName}</strong>, chúng tôi đã phải huỷ gói đăng ký. Các tính năng trả phí không còn khả dụng trên tài khoản của bạn.',
    cta: 'Đăng ký lại',
    miss: 'Chúng tôi rất tiếc khi bạn rời đi. Nếu đây là sự cố, bạn có thể đăng ký lại bất cứ lúc nào và tiếp tục từ chỗ đã dừng.',
    greeting: 'Xin chào {name},',
  },
}

/**
 * Render the final cancellation email after Stripe has exhausted its
 * Smart Retries window for the subscription.
 */
export function subscriptionFinalCancellationTemplate(
  data: SubscriptionFinalCancellationData,
  ctx: LocalEmailContext
): RenderedEmail {
  const section = dict[ctx.locale] ?? dict.en
  const subject = section.subject.replace('{appName}', ctx.appName)
  const heading = section.heading
  const intro = section.intro.replace('{planName}', escapeHtml(data.planName))
  const greeting = section.greeting.replace('{name}', escapeHtml(data.userName ?? 'there'))

  const footer = buildFooter(ctx.appName, ctx.locale)

  const html = renderLayout({
    heading,
    bodyInnerHtml: `
      <p class="email-text">${greeting}</p>
      <h1 class="email-heading">${escapeHtml(heading)}</h1>
      <p class="email-text">${intro}</p>
      <p><a class="email-cta" href="${escapeHtml(data.resubscribeUrl)}">${escapeHtml(section.cta)}</a></p>
      <p class="email-muted">${escapeHtml(section.miss)}</p>
    `,
    appName: ctx.appName,
    appKey: ctx.appKey,
    footer,
  })

  const text = htmlToText(html) + `\n\n${data.resubscribeUrl}\n`

  return { subject, html, text }
}
