/**
 * Shared HTML helpers for ezpay-local email templates.
 *
 * Mirrors the layout used by `@ezstart/email-service/templates/shared.ts`
 * but kept inline so we don't have to widen the public surface of the
 * email-service package every time ezpay ships a new email type.
 *
 * If a template here ever stabilizes and we want it reusable across other
 * ezstart apps, it should be promoted into `@ezstart/email-service` and
 * its renderer call site here replaced with the package import.
 */

export interface LocalEmailContext {
  /** Brand display name (e.g. `'EZPay'`, `'GreenPulse.AI'`). */
  appName: string
  /** App slug used as `data-app="..."` for theme scoping in email clients. */
  appKey: string
  /** Active locale for the rendered text. Defaults to `'en'` in callers. */
  locale: 'en' | 'fr' | 'vi'
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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
 * Render the standard ezpay email layout. Matches the visual style and
 * theme variable scoping (`data-app="..."`) used by
 * `@ezstart/email-service` so consumer-supplied themes apply uniformly.
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
      .email-warning {
        background: rgba(245, 158, 11, 0.08);
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 6px;
        padding: 12px 16px;
        margin-bottom: 16px;
        font-size: 14px;
        color: var(--foreground, #111111);
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
 * Standard footer (rights + no-reply notice) localized.
 */
export function buildFooter(appName: string, locale: 'en' | 'fr' | 'vi'): string {
  const year = new Date().getFullYear()
  const dict = footerDict[locale] ?? footerDict.en
  const rights = dict.rights.replace('{year}', String(year)).replace('{appName}', appName)
  return `<p style="margin:0 0 4px 0;">${escapeHtml(rights)}</p><p style="margin:0;">${escapeHtml(dict.noreply)}</p>`
}

const footerDict: Record<'en' | 'fr' | 'vi', { rights: string; noreply: string }> = {
  en: {
    rights: '© {year} {appName}. All rights reserved.',
    noreply: 'This is an automated message — please do not reply.',
  },
  fr: {
    rights: '© {year} {appName}. Tous droits réservés.',
    noreply: 'Ceci est un message automatisé — merci de ne pas y répondre.',
  },
  vi: {
    rights: '© {year} {appName}. Mọi quyền được bảo lưu.',
    noreply: 'Đây là tin nhắn tự động — vui lòng không trả lời.',
  },
}
