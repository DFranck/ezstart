import type { Request } from 'express'
import type { SupportedLocale } from '@ezstart/email-service'

/**
 * Locales currently supported by the email-service templates.
 * Mirrors `SupportedLocale` from `@ezstart/email-service`.
 */
const SUPPORTED_LOCALES = new Set<SupportedLocale>(['en', 'fr', 'vi'])

/**
 * Resolve the user's preferred locale for outgoing emails.
 *
 * Resolution order (first hit wins):
 *   1. `preferred` argument — typically the body-provided locale (`req.body.locale`)
 *      already validated by Zod. Caller passes it through so this helper can be
 *      the single source of truth at every email-sending route.
 *   2. `Accept-Language` header — first quality-ranked tag whose language
 *      subtag matches a supported locale. `en-GB`, `fr-FR;q=0.9`, etc. all
 *      collapse to their base language.
 *   3. `'en'` fallback — keeps templates rendering even when the request has
 *      no language hint at all (server-to-server calls, curl, tests).
 *
 * NEVER throws — emails are best-effort and must not break the auth flow if
 * a header is malformed.
 *
 * @example
 * ```ts
 * // delete-account.ts (no body locale field)
 * const locale = resolveUserLocale(req)
 *
 * // forgot-password.ts (body locale optional)
 * const locale = resolveUserLocale(req, parsed.data.locale)
 * ```
 */
export function resolveUserLocale(
  req: Request,
  preferred?: SupportedLocale | string | null
): SupportedLocale {
  // 1. Explicit preferred locale (from body, validated upstream).
  if (preferred && isSupportedLocale(preferred)) {
    return preferred
  }

  // 2. Accept-Language header parsing.
  const headerValue = req.headers['accept-language']
  const headerLocale = parseAcceptLanguage(headerValue)
  if (headerLocale) {
    return headerLocale
  }

  // 3. Hardcoded fallback.
  return 'en'
}

/**
 * Parse an `Accept-Language` header value and return the highest-priority
 * supported locale. Returns `null` when no tag matches.
 *
 * Accepts both quality-weighted (`fr-FR;q=0.9,en;q=0.7`) and bare lists
 * (`fr-FR,en`). Tag matching is done on the language subtag only — so
 * `en-US`, `en-GB`, `en-AU` all collapse to `en`.
 *
 * @internal
 */
function parseAcceptLanguage(headerValue: unknown): SupportedLocale | null {
  if (typeof headerValue !== 'string' || headerValue.length === 0) {
    return null
  }

  // 8 KiB cap — Accept-Language is at most a few hundred chars in practice;
  // anything larger is either malformed or a probe and should be ignored
  // rather than burn CPU on regex parsing.
  if (headerValue.length > 8192) {
    return null
  }

  const candidates = headerValue
    .split(',')
    .map(entry => parseEntry(entry.trim()))
    .filter((entry): entry is { tag: string; quality: number } => entry !== null)
    .sort((a, b) => b.quality - a.quality)

  for (const candidate of candidates) {
    const language = candidate.tag.split('-')[0]?.toLowerCase()
    if (language && isSupportedLocale(language)) {
      return language
    }
  }

  return null
}

/**
 * Parse a single Accept-Language entry like `fr-FR;q=0.9` into
 * `{ tag, quality }`. Returns `null` for malformed entries.
 *
 * @internal
 */
function parseEntry(entry: string): { tag: string; quality: number } | null {
  if (!entry) return null
  const [rawTag, ...params] = entry.split(';')
  const tag = rawTag?.trim()
  if (!tag) return null

  let quality = 1
  for (const param of params) {
    const [rawKey, rawValue] = param.split('=')
    const key = rawKey?.trim().toLowerCase()
    const value = rawValue?.trim()
    if (key === 'q' && value !== undefined) {
      const parsed = Number(value)
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
        quality = parsed
      }
    }
  }

  return { tag, quality }
}

/**
 * Type guard — returns true when the input is one of the locales the
 * email-service templates actually have a dictionary for.
 *
 * @internal
 */
function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.has(value as SupportedLocale)
}
