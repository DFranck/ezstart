import { buildFooter, escapeHtml, htmlToText, renderLayout, type LocalEmailContext } from './shared.js'

export interface MagicLinkData {
  /** The full sign-in URL (with token already appended). */
  signInUrl: string
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
    subject: 'Your sign-in link — {appName}',
    heading: 'Sign in to {appName}',
    intro: 'Click the button below to sign in. No password required.',
    cta: 'Sign in',
    expires: 'This link expires in 15 minutes and can only be used once.',
    ifNotYou: "If you didn't request this link, you can safely ignore this email.",
  },
  fr: {
    subject: 'Votre lien de connexion — {appName}',
    heading: 'Se connecter à {appName}',
    intro: 'Cliquez sur le bouton ci-dessous pour vous connecter. Aucun mot de passe requis.',
    cta: 'Se connecter',
    expires: 'Ce lien expire dans 15 minutes et ne peut être utilisé qu\'une seule fois.',
    ifNotYou: "Si vous n'avez pas demandé ce lien, vous pouvez ignorer cet e-mail.",
  },
  vi: {
    subject: 'Liên kết đăng nhập — {appName}',
    heading: 'Đăng nhập vào {appName}',
    intro: 'Nhấn vào nút bên dưới để đăng nhập. Không cần mật khẩu.',
    cta: 'Đăng nhập',
    expires: 'Liên kết này sẽ hết hạn sau 15 phút và chỉ có thể sử dụng một lần.',
    ifNotYou: 'Nếu bạn không yêu cầu liên kết này, bạn có thể bỏ qua email này.',
  },
}

/**
 * Render the magic-link sign-in email. The link is one-shot and
 * short-lived (15 min) because clicking it issues a full session, so it
 * is equivalent to a one-time password from the security model.
 */
export function magicLinkTemplate(data: MagicLinkData, ctx: LocalEmailContext): RenderedEmail {
  const section = dict[ctx.locale] ?? dict.en
  const subject = section.subject.replace('{appName}', ctx.appName)
  const heading = section.heading.replace('{appName}', ctx.appName)
  const footer = buildFooter(ctx.appName, ctx.locale)

  const html = renderLayout({
    heading,
    bodyInnerHtml: `
      <h1 class="email-heading">${escapeHtml(heading)}</h1>
      <p class="email-text">${escapeHtml(section.intro)}</p>
      <p><a class="email-cta" href="${escapeHtml(data.signInUrl)}">${escapeHtml(section.cta)}</a></p>
      <p class="email-muted">${escapeHtml(section.expires)}</p>
      <p class="email-muted">${escapeHtml(section.ifNotYou)}</p>
    `,
    appName: ctx.appName,
    appKey: ctx.appKey,
    footer,
  })

  const text = htmlToText(html) + `\n\n${data.signInUrl}\n`

  return { subject, html, text }
}
