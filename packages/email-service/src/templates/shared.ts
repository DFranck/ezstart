import type { EmailContext, EmailTemplateOverrides, SupportedLocale } from '../types.js'
import { en, type LocaleDict } from './locales/en.js'
import { fr } from './locales/fr.js'
import { vi } from './locales/vi.js'

const locales: Record<SupportedLocale, LocaleDict> = { en, fr, vi }

/**
 * Resolve a locale dictionary with EN fallback for unsupported locales or missing sections.
 */
export function getLocaleDict(locale: SupportedLocale = 'en'): LocaleDict {
  const dict = locales[locale] ?? locales.en
  // Shallow-merge each top-level section with EN fallback for missing keys.
  return {
    passwordReset: { ...en.passwordReset, ...dict.passwordReset },
    emailVerification: { ...en.emailVerification, ...dict.emailVerification },
    welcomeSetPassword: { ...en.welcomeSetPassword, ...dict.welcomeSetPassword },
    accountDeletion: { ...en.accountDeletion, ...dict.accountDeletion },
    common: { ...en.common, ...dict.common },
  }
}

/**
 * Replace `{placeholders}` in a string with values from a map.
 * Unknown placeholders are left untouched.
 */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key]
    return value === undefined || value === null ? match : String(value)
  })
}

/**
 * Apply overrides on top of a localized string. Returns the override if present, else localized.
 */
export function applyOverride(localized: string, override: string | undefined): string {
  return override !== undefined ? override : localized
}

/**
 * Strip HTML tags for a plain-text fallback. Very basic — not a full sanitizer.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface LayoutParts {
  heading: string
  bodyInnerHtml: string
  appName: string
  appKey: string
  footer: string
}

/**
 * Base HTML shell used by all templates.
 * Injects theme CSS vars (scoped via `data-app="{appKey}"`) so that consumers
 * supporting custom CSS can theme via `packages/ui/src/styles/themes/{appKey}/{appKey}.css`.
 * Strict email clients (Gmail, Outlook) fall back to inline styles.
 */
export function renderLayout(parts: LayoutParts): string {
  const { heading, bodyInnerHtml, appName, appKey, footer } = parts
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
    <style>
      /* Theme CSS variables (overridable by @ezstart/ui theme if client supports) */
      :root {
        --primary: #0070f3;
        --primary-foreground: #ffffff;
        --background: #ffffff;
        --foreground: #111111;
        --muted-foreground: #666666;
        --border: #e5e7eb;
      }
      body {
        margin: 0;
        padding: 0;
        background: var(--background, #ffffff);
        color: var(--foreground, #111111);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .email-wrapper {
        max-width: 600px;
        margin: 0 auto;
        padding: 32px 24px;
      }
      .email-header {
        padding-bottom: 16px;
        border-bottom: 1px solid var(--border, #e5e7eb);
        margin-bottom: 24px;
      }
      .email-brand {
        font-size: 20px;
        font-weight: 700;
        color: var(--primary, #0070f3);
        text-decoration: none;
      }
      .email-heading {
        font-size: 22px;
        font-weight: 600;
        margin: 0 0 16px 0;
        color: var(--foreground, #111111);
      }
      .email-text {
        font-size: 15px;
        line-height: 1.6;
        color: var(--foreground, #111111);
        margin: 0 0 16px 0;
      }
      .email-muted {
        font-size: 13px;
        line-height: 1.5;
        color: var(--muted-foreground, #666666);
        margin: 24px 0 0 0;
      }
      .email-cta {
        display: inline-block;
        background: var(--primary, #0070f3);
        color: var(--primary-foreground, #ffffff);
        padding: 12px 24px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 600;
        font-size: 15px;
        margin: 8px 0 16px 0;
      }
      .email-footer {
        margin-top: 32px;
        padding-top: 16px;
        border-top: 1px solid var(--border, #e5e7eb);
        font-size: 12px;
        color: var(--muted-foreground, #666666);
      }
      .email-notice {
        background: rgba(34, 197, 94, 0.08);
        border: 1px solid rgba(34, 197, 94, 0.3);
        border-radius: 6px;
        padding: 12px 16px;
        margin-bottom: 16px;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper" data-app="${escapeHtml(appKey)}">
      <div class="email-header">
        <span class="email-brand">${escapeHtml(appName)}</span>
      </div>
      ${bodyInnerHtml}
      <div class="email-footer">${footer}</div>
    </div>
  </body>
</html>`
}

/**
 * If `overrides.bodyHtml` is present, wrap it in the layout (keeping styles + header + footer).
 * Otherwise returns null so caller uses the default body.
 */
export function renderOverrideBody(
  overrides: EmailTemplateOverrides | undefined,
  ctx: Pick<EmailContext, 'appName' | 'appKey'>,
  heading: string,
  footer: string
): string | null {
  if (!overrides?.bodyHtml) return null
  return renderLayout({
    heading,
    bodyInnerHtml: overrides.bodyHtml,
    appName: ctx.appName,
    appKey: ctx.appKey,
    footer,
  })
}

/**
 * Build the standard footer HTML (rights + no-reply notice).
 */
export function buildFooter(appName: string, dict: LocaleDict): string {
  const year = new Date().getFullYear()
  const rights = interpolate(dict.common.footerRights, { year, appName })
  const noreply = dict.common.footerNoreply
  return `<p style="margin:0 0 4px 0;">${escapeHtml(rights)}</p><p style="margin:0;">${escapeHtml(noreply)}</p>`
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export { escapeHtml }
