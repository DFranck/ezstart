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

export interface EmailVerificationData {
  verifyUrl: string
}

/**
 * Render an email-verification email.
 * - Subject and heading are prefixed with `ctx.appName`.
 * - Uses `ctx.locale` (en/fr/vi) — falls back to EN.
 * - `ctx.overrides` can override any string or replace the entire body via `bodyHtml`.
 */
export function emailVerificationTemplate(
  data: EmailVerificationData,
  ctx: EmailContext
): RenderedEmail {
  const dict = getLocaleDict(ctx.locale)
  const section = dict.emailVerification
  const vars = { appName: ctx.appName }

  const subject = applyOverride(interpolate(section.subject, vars), ctx.overrides?.subject)
  const heading = applyOverride(interpolate(section.heading, vars), ctx.overrides?.heading)
  const intro = applyOverride(section.intro, ctx.overrides?.intro)
  const ctaLabel = applyOverride(section.ctaLabel, ctx.overrides?.ctaLabel)
  const outro = applyOverride(section.outro, ctx.overrides?.outro)

  const footer = buildFooter(ctx.appName, dict)

  const overrideBody = renderOverrideBody(ctx.overrides, ctx, heading, footer)
  const html =
    overrideBody ??
    renderLayout({
      heading,
      bodyInnerHtml: `
        <h1 class="email-heading">${escapeHtml(heading)}</h1>
        <p class="email-text">${escapeHtml(intro)}</p>
        <p><a class="email-cta" href="${escapeHtml(data.verifyUrl)}">${escapeHtml(ctaLabel)}</a></p>
        <p class="email-muted">${escapeHtml(outro)}</p>
      `,
      appName: ctx.appName,
      appKey: ctx.appKey,
      footer,
    })

  const text = htmlToText(html) + `\n\n${data.verifyUrl}\n`

  return {
    subject,
    html,
    text,
    ...(ctx.overrides?.from ? { from: ctx.overrides.from } : {}),
    ...(ctx.overrides?.replyTo ? { replyTo: ctx.overrides.replyTo } : {}),
  }
}
