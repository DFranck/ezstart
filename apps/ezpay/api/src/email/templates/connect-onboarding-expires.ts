/**
 * Connect onboarding expiry warning email — sent at J-6 (24h before the
 * pending row gets auto-cleaned by the cleanup scheduler at J-7).
 *
 * Goal: give the user one last chance to resume Stripe onboarding before
 * the row is hard-deleted and they have to start the whole flow over.
 */

import {
  buildFooter,
  escapeHtml,
  htmlToText,
  renderLayout,
  type LocalEmailContext,
} from './shared.js'

export interface ConnectOnboardingExpiresData {
  /** Direct URL to the per-Application Connect dashboard page (Resume button). */
  resumeUrl: string
  /** Business name the user submitted at first onboarding (for context). */
  businessName: string
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
    consequence: string
    ifIgnored: string
  }
> = {
  en: {
    subject: 'Your Stripe onboarding expires in 24 hours — {appName}',
    heading: 'Your Stripe onboarding expires soon',
    warning:
      'Your Stripe Connect onboarding for <strong>{businessName}</strong> will expire in 24 hours.',
    intro:
      'You started the Stripe onboarding 6 days ago but did not finish. Click below to resume where you left off:',
    cta: 'Resume Stripe onboarding',
    consequence:
      'After expiration, the pending account will be removed and you will need to start the whole onboarding flow from scratch.',
    ifIgnored:
      'If you no longer need this Connect account, you can safely ignore this email — it will be cleaned up automatically.',
  },
  fr: {
    subject: 'Votre intégration Stripe expire dans 24 heures — {appName}',
    heading: 'Votre intégration Stripe expire bientôt',
    warning:
      'Votre intégration Stripe Connect pour <strong>{businessName}</strong> expirera dans 24 heures.',
    intro:
      "Vous avez commencé l'intégration Stripe il y a 6 jours mais ne l'avez pas terminée. Cliquez ci-dessous pour reprendre là où vous en étiez :",
    cta: "Reprendre l'intégration Stripe",
    consequence:
      "Après expiration, le compte en attente sera supprimé et vous devrez recommencer toute l'intégration depuis le début.",
    ifIgnored:
      "Si vous n'avez plus besoin de ce compte Connect, vous pouvez ignorer cet e-mail — il sera nettoyé automatiquement.",
  },
  vi: {
    subject: 'Quá trình thiết lập Stripe của bạn hết hạn sau 24 giờ — {appName}',
    heading: 'Thiết lập Stripe của bạn sắp hết hạn',
    warning: 'Thiết lập Stripe Connect cho <strong>{businessName}</strong> sẽ hết hạn sau 24 giờ.',
    intro:
      'Bạn đã bắt đầu thiết lập Stripe 6 ngày trước nhưng chưa hoàn tất. Nhấn vào bên dưới để tiếp tục:',
    cta: 'Tiếp tục thiết lập Stripe',
    consequence:
      'Sau khi hết hạn, tài khoản đang chờ sẽ bị xóa và bạn sẽ phải thực hiện lại toàn bộ quy trình từ đầu.',
    ifIgnored:
      'Nếu bạn không còn cần tài khoản Connect này, bạn có thể bỏ qua email này — nó sẽ được tự động dọn dẹp.',
  },
}

/**
 * Render the J-6 Connect onboarding expiry warning email.
 *
 * Sent once per pending ConnectedAccount row when its `createdAt` crosses
 * the 6-day threshold. Idempotency is enforced by the cleanup scheduler
 * via `expiryWarningEmailSent: true`.
 */
export function connectOnboardingExpiresTemplate(
  data: ConnectOnboardingExpiresData,
  ctx: LocalEmailContext
): RenderedEmail {
  const section = dict[ctx.locale] ?? dict.en
  const subject = section.subject.replace('{appName}', ctx.appName)
  const heading = section.heading
  const warning = section.warning.replace('{businessName}', escapeHtml(data.businessName))

  const footer = buildFooter(ctx.appName, ctx.locale)

  const html = renderLayout({
    heading,
    bodyInnerHtml: `
      <h1 class="email-heading">${escapeHtml(heading)}</h1>
      <div class="email-warning">${warning}</div>
      <p class="email-text">${escapeHtml(section.intro)}</p>
      <p><a class="email-cta" href="${escapeHtml(data.resumeUrl)}">${escapeHtml(section.cta)}</a></p>
      <p class="email-muted">${escapeHtml(section.consequence)}</p>
      <p class="email-muted">${escapeHtml(section.ifIgnored)}</p>
    `,
    appName: ctx.appName,
    appKey: ctx.appKey,
    footer,
  })

  const text = htmlToText(html) + `\n\n${data.resumeUrl}\n`

  return { subject, html, text }
}
