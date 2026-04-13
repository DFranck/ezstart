import type { EmailContext, RenderedEmail } from '../types.js'
import {
  applyOverride,
  buildFooter,
  escapeHtml,
  getLocaleDict,
  htmlToText,
  interpolate,
  renderLayout,
  renderOverrideBody,
} from './shared.js'

export interface WelcomeSetPasswordData {
  setPasswordUrl: string
  username: string
  customMessage?: string
  promoCode?: string
}

/**
 * Render a welcome-set-password email (account created, asks user to secure with a password).
 * - Subject and heading prefixed with `ctx.appName`.
 * - Uses `ctx.locale` (en/fr/vi) — falls back to EN.
 * - `ctx.overrides` can override any string or replace the entire body via `bodyHtml`.
 * - `customMessage` (if provided) is rendered in a highlighted notice box in place of the promo block.
 */
export function welcomeSetPasswordTemplate(
  data: WelcomeSetPasswordData,
  ctx: EmailContext
): RenderedEmail {
  const dict = getLocaleDict(ctx.locale)
  const section = dict.welcomeSetPassword
  const vars = { appName: ctx.appName, username: data.username }

  const subject = applyOverride(interpolate(section.subject, vars), ctx.overrides?.subject)
  const heading = applyOverride(interpolate(section.heading, vars), ctx.overrides?.heading)
  const intro = applyOverride(section.intro, ctx.overrides?.intro)
  const ctaLabel = applyOverride(section.ctaLabel, ctx.overrides?.ctaLabel)
  const outro = applyOverride(section.outro, ctx.overrides?.outro)

  const customMessageHtml = data.customMessage
    ? `<div class="email-notice">${escapeHtml(data.customMessage)}</div>`
    : ''

  const promoHtml =
    !data.customMessage && data.promoCode
      ? `<div class="email-notice">${escapeHtml(
          interpolate(section.promoMessage, { promoCode: data.promoCode })
        )}</div>`
      : ''

  const footer = buildFooter(ctx.appName, dict)

  const overrideBody = renderOverrideBody(ctx.overrides, ctx, heading, footer)
  const html =
    overrideBody ??
    renderLayout({
      heading,
      bodyInnerHtml: `
        <h1 class="email-heading">${escapeHtml(heading)}</h1>
        ${customMessageHtml}
        ${promoHtml}
        <p class="email-text">${escapeHtml(intro)}</p>
        <p><a class="email-cta" href="${escapeHtml(data.setPasswordUrl)}">${escapeHtml(ctaLabel)}</a></p>
        <p class="email-muted">${escapeHtml(outro)}</p>
      `,
      appName: ctx.appName,
      appKey: ctx.appKey,
      footer,
    })

  const text = htmlToText(html) + `\n\n${data.setPasswordUrl}\n`

  return {
    subject,
    html,
    text,
    ...(ctx.overrides?.from ? { from: ctx.overrides.from } : {}),
    ...(ctx.overrides?.replyTo ? { replyTo: ctx.overrides.replyTo } : {}),
  }
}
