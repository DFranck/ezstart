/**
 * Money contracts.
 *
 * Canonical wire shape for any monetary value handled by `@ezstart`-compatible
 * APIs. Two principles drive the design:
 *
 * 1. **Always integer cents** — never floats. JavaScript number arithmetic on
 *    decimals is lossy (`0.1 + 0.2 === 0.30000000000000004`), so a malicious or
 *    buggy client could bypass server validation by sending a non-canonical
 *    fractional amount. Mirrors the Stripe API which has used integer cents
 *    since day one.
 * 2. **ISO 4217 currency** — uppercase alpha-3 codes from a closed enum.
 *    Extending the enum is deliberate, not implicit.
 *
 * @see standard-saas-billing.md §1 (currency)
 * @see standard-saas-data.md §3 (wire validation)
 */

import { z } from 'zod'

/**
 * Currency code, ISO 4217 alpha-3 uppercase.
 *
 * Locked to the currencies our SaaS supports today. Extending requires a
 * deliberate code change here (and likely a migration on stored amounts).
 *
 * - `EUR` — Euro (€)
 * - `USD` — US Dollar ($)
 * - `GBP` — British Pound (£)
 * - `JPY` — Japanese Yen (¥) — no subunit, "cents" = whole yen
 * - `CAD` — Canadian Dollar
 * - `AUD` — Australian Dollar
 * - `CHF` — Swiss Franc
 * - `CNY` — Chinese Yuan
 * - `INR` — Indian Rupee
 * - `BRL` — Brazilian Real
 *
 * @example
 * ```ts
 * CurrencyCodeSchema.parse('EUR') // 'EUR'
 * CurrencyCodeSchema.parse('eur') // throws — must be uppercase
 * CurrencyCodeSchema.parse('XYZ') // throws — not in the list
 * ```
 */
export const CurrencyCodeSchema = z.enum([
  'EUR',
  'USD',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
  'CNY',
  'INR',
  'BRL',
])

/**
 * TypeScript union of all supported currency codes.
 *
 * @example
 * ```ts
 * function formatPrice(currency: CurrencyCode, cents: number) { ... }
 * ```
 */
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>

/**
 * Hard upper bound on a single amount.
 *
 * `999_999_999` cents = ~€9.99M / $9.99M — large enough for any realistic
 * single transaction, but small enough to fit comfortably inside an int32
 * (max 2_147_483_647) so downstream systems that still use 32-bit signed
 * integers don't overflow.
 *
 * For aggregates that may exceed this (yearly revenue, lifetime value),
 * pre-aggregate server-side and emit a derived numeric type — do NOT relax
 * this cap.
 *
 * @internal
 */
const AMOUNT_CENTS_MAX = 999_999_999

/**
 * Amount in the currency's smallest unit ("cents" for EUR/USD, whole yen for
 * JPY, etc.).
 *
 * Constraints:
 * - Integer (no float arithmetic on money — see module-level rationale)
 * - Positive (zero-amount checkouts are forbidden; emit `null` / omit the
 *   field for "no charge" semantics)
 * - Finite (rejects `NaN`, `Infinity`, `-Infinity`)
 * - Bounded at {@link AMOUNT_CENTS_MAX} (`999_999_999`)
 *
 * Servers should `AmountCentsSchema.parse(req.body.amount)` and storage
 * layers should pin the column to a 64-bit signed integer.
 *
 * @example
 * ```ts
 * AmountCentsSchema.parse(1000)   // 1000 (= €10.00 if currency='EUR')
 * AmountCentsSchema.parse(0)      // throws — must be positive
 * AmountCentsSchema.parse(1.5)    // throws — must be integer
 * AmountCentsSchema.parse(-100)   // throws — must be positive
 * AmountCentsSchema.parse(1e10)   // throws — exceeds max
 * AmountCentsSchema.parse('100')  // throws — must be a number, not a string
 * ```
 */
export const AmountCentsSchema = z
  .number()
  .int()
  .positive()
  .finite()
  .max(AMOUNT_CENTS_MAX, `Must be at most ${AMOUNT_CENTS_MAX}`)
  .describe('Amount in the currency smallest unit (integer cents, 1..999999999)')

/**
 * Inferred TypeScript type for an `AmountCents` value.
 *
 * Always a positive integer number — never a float, never a string.
 */
export type AmountCents = z.infer<typeof AmountCentsSchema>

/**
 * Money pair: amount in smallest unit + ISO 4217 currency code.
 *
 * Canonical wire shape for any monetary value. Combine instead of passing two
 * loose parameters so that the unit/currency invariant cannot drift.
 *
 * @example
 * ```ts
 * const price: Money = MoneySchema.parse({ amount: 1234, currency: 'EUR' })
 * // price.amount  → 1234   (cents, = €12.34)
 * // price.currency → 'EUR'
 * ```
 */
export const MoneySchema = z.object({
  amount: AmountCentsSchema,
  currency: CurrencyCodeSchema,
})

/**
 * Inferred TypeScript type for a `Money` object.
 */
export type Money = z.infer<typeof MoneySchema>

/**
 * Map of currencies to their minor-unit exponent (number of fractional digits
 * in the major unit). Used by {@link formatMoney} to convert integer minor
 * units into the major-unit decimal that `Intl.NumberFormat` expects.
 *
 * - JPY has zero fractional digits (`1 JPY = 1 yen`, no "cents")
 * - all other supported currencies have two fractional digits
 *
 * @internal
 */
const MINOR_UNIT_EXPONENT: Readonly<Record<CurrencyCode, number>> = Object.freeze({
  EUR: 2,
  USD: 2,
  GBP: 2,
  JPY: 0,
  CAD: 2,
  AUD: 2,
  CHF: 2,
  CNY: 2,
  INR: 2,
  BRL: 2,
})

/**
 * Format a {@link Money} value for human display, locale-aware.
 *
 * - Converts integer minor units back to the major unit using the
 *   currency-specific exponent (JPY: 0, all others: 2).
 * - Delegates the actual formatting to `Intl.NumberFormat` so the output
 *   respects the locale's grouping, decimal separator, currency placement,
 *   and symbol.
 * - **A.4 fix (Lot 2.1.1, 2026-05-16)** — if `locale` is not a valid BCP 47
 *   tag, `Intl.NumberFormat` would throw `RangeError("Incorrect locale
 *   information provided")`. To defuse that footgun for callers that forward
 *   an unvalidated `Accept-Language` header straight in, the function
 *   transparently falls back to `'en'` instead of throwing. The caller still
 *   gets a usable string; the cost is a silent locale downgrade rather than
 *   a runtime crash.
 *
 * @param money - parsed {@link Money} object
 * @param locale - BCP 47 locale tag (default `'en'`)
 *
 * @example
 * ```ts
 * formatMoney({ amount: 1234, currency: 'EUR' }, 'fr-FR')        // '12,34 €'
 * formatMoney({ amount: 1234, currency: 'EUR' }, 'en')           // '€12.34'
 * formatMoney({ amount: 1234, currency: 'USD' }, 'en-US')        // '$12.34'
 * formatMoney({ amount: 1234, currency: 'JPY' }, 'ja-JP')        // '￥1,234'  (no decimal)
 * formatMoney({ amount: 100,  currency: 'EUR' }, 'invalid-XYZ')  // '€1.00'   (en fallback)
 * ```
 */
export function formatMoney(money: Money, locale: string = 'en'): string {
  const exponent = MINOR_UNIT_EXPONENT[money.currency]
  const major = money.amount / 10 ** exponent
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
    }).format(major)
  } catch {
    // Invalid locale (e.g. caller forwarded an unvalidated Accept-Language
    // header). Fall back to 'en' rather than surfacing the RangeError —
    // defense in depth, never a crash on display formatting.
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: money.currency,
    }).format(major)
  }
}
