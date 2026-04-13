/**
 * Default locale per ISO 4217 currency code.
 *
 * Used as a deterministic fallback when no `locale` is provided, to guarantee
 * identical formatting on server (Node) and client (browser) and avoid React
 * hydration mismatches. Without this, `Intl.NumberFormat(undefined, ...)` falls
 * back to the host system locale — which differs between Node SSR (often en-US)
 * and the user's browser (e.g. fr-FR), producing mismatches like
 * `€5.00` (server) vs `5,00 €` (client).
 */
const DEFAULT_LOCALE_BY_CURRENCY: Record<string, string> = {
  EUR: 'fr-FR',
  USD: 'en-US',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  CHF: 'de-CH',
  CAD: 'en-CA',
  AUD: 'en-AU',
  CNY: 'zh-CN',
  KRW: 'ko-KR',
}

function resolveLocale(currency: string, locale?: string): string {
  if (locale) return locale
  return DEFAULT_LOCALE_BY_CURRENCY[currency.toUpperCase()] ?? 'en-US'
}

/**
 * Format a monetary amount with proper currency symbol and locale formatting.
 * Uses `Intl.NumberFormat` — standard browser API, no i18n dependency.
 *
 * @param amount  - Numeric value (e.g. 10.5)
 * @param currency - ISO 4217 code (EUR, USD, GBP, etc.). Defaults to EUR.
 * @param locale  - Optional BCP 47 locale tag. If omitted, a deterministic
 *                  per-currency default is used (SSR-safe, no hydration mismatch).
 * @returns Formatted string, e.g. "10,50 €" or "$10.50"
 */
export function formatCurrency(amount: number, currency = 'EUR', locale?: string): string {
  return new Intl.NumberFormat(resolveLocale(currency, locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Return the narrow currency symbol for an ISO code.
 * Useful when you need just the symbol (e.g. for input prefixes).
 *
 * @example getCurrencySymbol('EUR') // "€"
 * @example getCurrencySymbol('USD') // "$"
 * @example getCurrencySymbol('GBP') // "£"
 */
export function getCurrencySymbol(currency = 'EUR', locale?: string): string {
  const parts = new Intl.NumberFormat(resolveLocale(currency, locale), {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).formatToParts(0)

  return parts.find(p => p.type === 'currency')?.value ?? currency
}
