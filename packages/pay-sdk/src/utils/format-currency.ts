/**
 * Format a monetary amount with proper currency symbol and locale formatting.
 * Uses `Intl.NumberFormat` — standard browser API, no i18n dependency.
 *
 * @param amount  - Numeric value (e.g. 10.5)
 * @param currency - ISO 4217 code (EUR, USD, GBP, etc.). Defaults to EUR.
 * @param locale  - Optional BCP 47 locale tag. Defaults to undefined (browser default).
 * @returns Formatted string, e.g. "10,50 EUR" or "$10.50"
 */
export function formatCurrency(amount: number, currency = 'EUR', locale?: string): string {
  return new Intl.NumberFormat(locale, {
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
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).formatToParts(0)

  return parts.find(p => p.type === 'currency')?.value ?? currency
}
