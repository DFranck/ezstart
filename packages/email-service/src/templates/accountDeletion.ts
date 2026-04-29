import type { EmailContext, RenderedEmail, SupportedLocale } from '../types.js'
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

export interface AccountDeletionData {
  /** Display name of the user — typically the username, used in the greeting. */
  username: string
  /** The email address of the soft-deleted account, surfaced for confirmation. */
  email: string
  /** When the hard-delete cron will permanently purge the account. */
  scheduledHardDeleteAt: Date
  /** Number of days the user has to cancel by signing back in. */
  gracePeriodDays: number
}

/**
 * Locale-aware date formatters for the scheduled-deletion timestamp.
 * BCP-47 tags map onto the `SupportedLocale` set used by the templates so
 * the rendered date matches the rest of the email body (FR users see a FR
 * date, VI users see a VI date, etc.).
 */
const DATE_LOCALES: Record<SupportedLocale, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  vi: 'vi-VN',
}

/**
 * Render an account-deletion-scheduled email.
 * - Sent fire-and-forget after a successful soft-delete request.
 * - Subject and heading prefixed with `ctx.appName`.
 * - Uses `ctx.locale` (en/fr/vi) — falls back to EN.
 * - The scheduled-deletion date is formatted in the user's locale (long form, UTC).
 * - `ctx.overrides` can override any string or replace the entire body via `bodyHtml`.
 */
export function accountDeletionTemplate(
  data: AccountDeletionData,
  ctx: EmailContext
): RenderedEmail {
  const dict = getLocaleDict(ctx.locale)
  const section = dict.accountDeletion
  const locale: SupportedLocale = ctx.locale ?? 'en'

  const formattedDate = new Intl.DateTimeFormat(DATE_LOCALES[locale] ?? DATE_LOCALES.en, {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(data.scheduledHardDeleteAt)

  const vars = {
    appName: ctx.appName,
    username: data.username,
    email: data.email,
    date: formattedDate,
    gracePeriodDays: data.gracePeriodDays,
  }

  const subject = applyOverride(interpolate(section.subject, vars), ctx.overrides?.subject)
  const heading = applyOverride(interpolate(section.heading, vars), ctx.overrides?.heading)
  const intro = applyOverride(interpolate(section.intro, vars), ctx.overrides?.intro)
  const schedule = interpolate(section.schedule, vars)
  const grace = interpolate(section.grace, vars)
  const ifNotYou = interpolate(section.ifNotYou, vars)
  const signature = interpolate(section.signature, vars)

  const footer = buildFooter(ctx.appName, dict)

  const overrideBody = renderOverrideBody(ctx.overrides, ctx, heading, footer)
  const html =
    overrideBody ??
    renderLayout({
      heading,
      bodyInnerHtml: `
        <h1 class="email-heading">${escapeHtml(heading)}</h1>
        <p class="email-text">${escapeHtml(intro)}</p>
        <p class="email-text">${escapeHtml(schedule)}</p>
        <p class="email-text">${escapeHtml(grace)}</p>
        <p class="email-muted">${escapeHtml(ifNotYou)}</p>
        <p class="email-muted">${escapeHtml(signature)}</p>
      `,
      appName: ctx.appName,
      appKey: ctx.appKey,
      footer,
    })

  const text = htmlToText(html)

  return {
    subject,
    html,
    text,
    ...(ctx.overrides?.from ? { from: ctx.overrides.from } : {}),
    ...(ctx.overrides?.replyTo ? { replyTo: ctx.overrides.replyTo } : {}),
  }
}
