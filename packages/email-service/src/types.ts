export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string // Override default sender
  replyTo?: string
  cc?: string[]
  bcc?: string[]
  tags?: Record<string, string>
}

export interface EmailResult {
  id: string
  success: boolean
}

export interface IEmailProvider {
  name: string
  send(options: EmailOptions): Promise<EmailResult>
}

export interface EmailServiceConfig {
  defaultFrom: string // e.g. "EZStart <noreply@ezstart.xyz>"
  provider: IEmailProvider
}

/**
 * Supported locales for email templates.
 * EN = English (fallback), FR = French, VI = Vietnamese.
 */
export type SupportedLocale = 'en' | 'fr' | 'vi'

/**
 * Overrides applied on top of the default localized template strings.
 * If `bodyHtml` is provided, it replaces the entire HTML body (wrapper + styles preserved).
 */
export interface EmailTemplateOverrides {
  subject?: string
  heading?: string
  intro?: string
  ctaLabel?: string
  outro?: string
  from?: string // custom sender email (e.g. "GreenPulse <noreply@ai-greenpulse.com>")
  replyTo?: string
  bodyHtml?: string // if set, replaces entire HTML body
}

/**
 * Runtime context for rendering an email template.
 * - `appName`: human-readable app name (used in subject / heading prefixes).
 * - `appKey`: matches the theme key in `@ezstart/ui` (e.g. 'green-pulse', 'ezstart', 'gacha-analyzer').
 * - `locale`: defaults to 'en' when omitted.
 * - `overrides`: optional per-send overrides (e.g. earthday campaign).
 */
export interface EmailContext {
  appName: string
  appKey: string
  locale?: SupportedLocale
  overrides?: EmailTemplateOverrides
}

/**
 * Rendered email output. `from` and `replyTo` only set when overrides provide them.
 */
export interface RenderedEmail {
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}
