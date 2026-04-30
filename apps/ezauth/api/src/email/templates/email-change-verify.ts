import {
  buildFooter,
  escapeHtml,
  htmlToText,
  renderLayout,
  type LocalEmailContext,
} from './shared.js'

export interface EmailChangeVerifyData {
  /** The full verify URL (with token already appended). */
  verifyUrl: string
  /** Old email of the account (shown in body for confirmation context). */
  oldEmail: string
  /** New email being requested. */
  newEmail: string
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
    expires: string
    ifNotYou: string
  }
> = {
  en: {
    subject: 'Verify your new email address — {appName}',
    heading: 'Verify your new email',
    intro:
      'You requested to change your {appName} email from <strong>{oldEmail}</strong> to <strong>{newEmail}</strong>. Click the button below to confirm:',
    cta: 'Verify new email',
    expires: 'This link expires in 24 hours.',
    ifNotYou:
      "If you didn't request this change, ignore this email and contact our support team immediately.",
  },
  fr: {
    subject: 'Vérifiez votre nouvelle adresse e-mail — {appName}',
    heading: 'Vérifiez votre nouvel e-mail',
    intro:
      'Vous avez demandé à changer votre adresse e-mail {appName} de <strong>{oldEmail}</strong> vers <strong>{newEmail}</strong>. Cliquez sur le bouton ci-dessous pour confirmer :',
    cta: 'Vérifier le nouvel e-mail',
    expires: 'Ce lien expire dans 24 heures.',
    ifNotYou:
      "Si vous n'êtes pas à l'origine de ce changement, ignorez cet e-mail et contactez immédiatement notre support.",
  },
  vi: {
    subject: 'Xác minh địa chỉ email mới của bạn — {appName}',
    heading: 'Xác minh email mới',
    intro:
      'Bạn đã yêu cầu thay đổi email {appName} từ <strong>{oldEmail}</strong> sang <strong>{newEmail}</strong>. Nhấn vào nút bên dưới để xác nhận:',
    cta: 'Xác minh email mới',
    expires: 'Liên kết này sẽ hết hạn sau 24 giờ.',
    ifNotYou:
      'Nếu bạn không yêu cầu thay đổi này, hãy bỏ qua email này và liên hệ ngay với bộ phận hỗ trợ.',
  },
}

/**
 * Render the email-change verification email.
 *
 * Sent to the NEW email address (not the old one) — the user must
 * demonstrate ownership of the new address before we update the account.
 */
export function emailChangeVerifyTemplate(
  data: EmailChangeVerifyData,
  ctx: LocalEmailContext
): RenderedEmail {
  const section = dict[ctx.locale] ?? dict.en
  const subject = section.subject.replace('{appName}', ctx.appName)
  const heading = section.heading
  const intro = section.intro
    .replace('{appName}', escapeHtml(ctx.appName))
    .replace('{oldEmail}', escapeHtml(data.oldEmail))
    .replace('{newEmail}', escapeHtml(data.newEmail))

  const footer = buildFooter(ctx.appName, ctx.locale)

  const html = renderLayout({
    heading,
    bodyInnerHtml: `
      <h1 class="email-heading">${escapeHtml(heading)}</h1>
      <p class="email-text">${intro}</p>
      <p><a class="email-cta" href="${escapeHtml(data.verifyUrl)}">${escapeHtml(section.cta)}</a></p>
      <p class="email-muted">${escapeHtml(section.expires)}</p>
      <p class="email-muted">${escapeHtml(section.ifNotYou)}</p>
    `,
    appName: ctx.appName,
    appKey: ctx.appKey,
    footer,
  })

  const text = htmlToText(html) + `\n\n${data.verifyUrl}\n`

  return { subject, html, text }
}
