import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  AmountCentsSchema,
  CurrencyCodeSchema,
  formatMoney,
  MoneySchema,
  type AmountCents,
  type CurrencyCode,
  type Money,
} from '../money.js'

describe('CurrencyCodeSchema', () => {
  it('accepts every supported ISO 4217 alpha-3 code', () => {
    const supported: CurrencyCode[] = [
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
    ]
    for (const code of supported) {
      expect(CurrencyCodeSchema.parse(code)).toBe(code)
    }
  })

  it('rejects lowercase variants (must be uppercase ISO)', () => {
    expect(() => CurrencyCodeSchema.parse('eur')).toThrow()
    expect(() => CurrencyCodeSchema.parse('usd')).toThrow()
    expect(() => CurrencyCodeSchema.parse('Eur')).toThrow()
  })

  it('rejects unsupported codes', () => {
    expect(() => CurrencyCodeSchema.parse('XYZ')).toThrow()
    expect(() => CurrencyCodeSchema.parse('XBT')).toThrow() // bitcoin
    expect(() => CurrencyCodeSchema.parse('')).toThrow()
  })

  it('rejects non-string inputs', () => {
    expect(() => CurrencyCodeSchema.parse(978)).toThrow() // ISO 4217 numeric code
    expect(() => CurrencyCodeSchema.parse(null)).toThrow()
    expect(() => CurrencyCodeSchema.parse(undefined)).toThrow()
    expect(() => CurrencyCodeSchema.parse({ code: 'EUR' })).toThrow()
  })

  it('exports a type union of exactly the supported codes', () => {
    expectTypeOf<CurrencyCode>().toEqualTypeOf<
      'EUR' | 'USD' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'INR' | 'BRL'
    >()
  })
})

describe('AmountCentsSchema', () => {
  it('accepts positive integers', () => {
    expect(AmountCentsSchema.parse(1)).toBe(1)
    expect(AmountCentsSchema.parse(100)).toBe(100)
    expect(AmountCentsSchema.parse(1234)).toBe(1234)
    expect(AmountCentsSchema.parse(999_999_999)).toBe(999_999_999)
  })

  it('rejects zero (zero-amount checkouts forbidden)', () => {
    expect(() => AmountCentsSchema.parse(0)).toThrow()
  })

  it('rejects negative integers', () => {
    expect(() => AmountCentsSchema.parse(-1)).toThrow()
    expect(() => AmountCentsSchema.parse(-100)).toThrow()
    expect(() => AmountCentsSchema.parse(Number.MIN_SAFE_INTEGER)).toThrow()
  })

  it('rejects floats (precision-loss anti-pattern)', () => {
    expect(() => AmountCentsSchema.parse(1.5)).toThrow()
    expect(() => AmountCentsSchema.parse(0.1)).toThrow()
    expect(() => AmountCentsSchema.parse(0.1 + 0.2)).toThrow() // 0.30000000000000004
    expect(() => AmountCentsSchema.parse(1234.5678)).toThrow()
  })

  it('rejects non-finite numbers', () => {
    expect(() => AmountCentsSchema.parse(Number.POSITIVE_INFINITY)).toThrow()
    expect(() => AmountCentsSchema.parse(Number.NEGATIVE_INFINITY)).toThrow()
    expect(() => AmountCentsSchema.parse(Number.NaN)).toThrow()
  })

  it('rejects amounts exceeding the hard cap (999_999_999)', () => {
    expect(() => AmountCentsSchema.parse(1_000_000_000)).toThrow()
    expect(() => AmountCentsSchema.parse(1e10)).toThrow()
    expect(() => AmountCentsSchema.parse(Number.MAX_SAFE_INTEGER)).toThrow()
  })

  it('rejects non-number inputs (string coercion forbidden)', () => {
    expect(() => AmountCentsSchema.parse('100')).toThrow()
    expect(() => AmountCentsSchema.parse('1234')).toThrow()
    expect(() => AmountCentsSchema.parse(null)).toThrow()
    expect(() => AmountCentsSchema.parse(undefined)).toThrow()
    expect(() => AmountCentsSchema.parse(true)).toThrow()
    expect(() => AmountCentsSchema.parse([100])).toThrow()
    expect(() => AmountCentsSchema.parse({ valueOf: () => 100 })).toThrow()
  })

  it('infers as number (not string, not branded)', () => {
    expectTypeOf<AmountCents>().toEqualTypeOf<number>()
  })
})

describe('MoneySchema', () => {
  it('accepts a valid amount + currency pair', () => {
    const parsed: Money = MoneySchema.parse({ amount: 1234, currency: 'EUR' })
    expect(parsed).toEqual({ amount: 1234, currency: 'EUR' })
  })

  it('rejects missing amount', () => {
    expect(() => MoneySchema.parse({ currency: 'EUR' })).toThrow()
  })

  it('rejects missing currency', () => {
    expect(() => MoneySchema.parse({ amount: 1234 })).toThrow()
  })

  it('propagates AmountCentsSchema failures', () => {
    expect(() => MoneySchema.parse({ amount: 0, currency: 'EUR' })).toThrow()
    expect(() => MoneySchema.parse({ amount: 1.5, currency: 'EUR' })).toThrow()
    expect(() => MoneySchema.parse({ amount: -100, currency: 'EUR' })).toThrow()
  })

  it('propagates CurrencyCodeSchema failures', () => {
    expect(() => MoneySchema.parse({ amount: 100, currency: 'eur' })).toThrow()
    expect(() => MoneySchema.parse({ amount: 100, currency: 'XYZ' })).toThrow()
  })
})

describe('formatMoney', () => {
  it('formats EUR with two decimal places in en locale', () => {
    const out = formatMoney({ amount: 1234, currency: 'EUR' }, 'en')
    // €12.34 in en — exact symbol/glue depends on ICU; assert the digits
    expect(out).toContain('12.34')
    expect(out).toMatch(/€|EUR/)
  })

  it('formats EUR in fr-FR with comma decimal separator', () => {
    const out = formatMoney({ amount: 1234, currency: 'EUR' }, 'fr-FR')
    expect(out).toContain('12,34')
    expect(out).toMatch(/€|EUR/)
  })

  it('formats USD in en-US with $ symbol', () => {
    const out = formatMoney({ amount: 1234, currency: 'USD' }, 'en-US')
    expect(out).toBe('$12.34')
  })

  it('formats JPY without fractional digits (zero-exponent currency)', () => {
    const out = formatMoney({ amount: 1234, currency: 'JPY' }, 'ja-JP')
    // ja-JP renders as ￥1,234 — assert digits + no decimal separator
    expect(out).toContain('1,234')
    expect(out).not.toContain('.')
    // Yen symbol — accept either fullwidth ￥ or halfwidth ¥
    expect(out).toMatch(/[￥¥]|JPY/)
  })

  it('JPY amount 100 renders as 100, not 1.00', () => {
    const out = formatMoney({ amount: 100, currency: 'JPY' }, 'en-US')
    // en-US for JPY: ¥100 (no decimals)
    expect(out).toContain('100')
    expect(out).not.toContain('1.00')
  })

  it('defaults to en locale when none provided', () => {
    const out = formatMoney({ amount: 1234, currency: 'USD' })
    expect(out).toBe('$12.34')
  })

  it('formats the upper boundary correctly', () => {
    const out = formatMoney({ amount: 999_999_999, currency: 'USD' }, 'en-US')
    // 999_999_999 cents = $9,999,999.99
    expect(out).toContain('9,999,999.99')
  })

  it('formats minimal amount (1 cent) correctly', () => {
    const out = formatMoney({ amount: 1, currency: 'USD' }, 'en-US')
    expect(out).toBe('$0.01')
  })

  // -------------------------------------------------------------------------
  // A.4 — invalid locale must NOT throw (Lot 2.1.1 fix)
  //
  // Source: tmp/hacker-wave-a-lot2-1.md §A.4
  //
  // Previously, `Intl.NumberFormat(invalidLocale, ...)` surfaced a
  // `RangeError("Incorrect locale information provided")` to the caller. Any
  // consumer forwarding an unvalidated `Accept-Language` header straight into
  // `formatMoney` would crash at display time. We now fall back to 'en'
  // silently — defense in depth, never a crash on display.
  // -------------------------------------------------------------------------

  describe('formatMoney — invalid locale fallback (A.4)', () => {
    it('does NOT throw on a garbage locale tag', () => {
      expect(() => formatMoney({ amount: 100, currency: 'EUR' }, 'invalid-XYZ')).not.toThrow()
    })

    it('falls back to en formatting when locale is garbage', () => {
      const out = formatMoney({ amount: 100, currency: 'EUR' }, 'invalid-XYZ')
      // en formatting for €1.00 — exact symbol depends on ICU but the digits
      // and decimal are stable
      expect(out).toContain('1.00')
      expect(out).toMatch(/€|EUR/)
    })

    it('does NOT throw on a script-injection-shaped locale (defense in depth)', () => {
      expect(() =>
        formatMoney({ amount: 100, currency: 'EUR' }, '<script>alert(1)</script>')
      ).not.toThrow()
    })

    it('regression: legitimate fr-FR still works (does not hit fallback)', () => {
      const out = formatMoney({ amount: 100, currency: 'EUR' }, 'fr-FR')
      // fr-FR formats 1.00 EUR as "1,00 €" — comma separator confirms the
      // fallback was NOT used (en would emit a period).
      expect(out).toContain('1,00')
      expect(out).toMatch(/€|EUR/)
    })

    it('regression: default locale (en) still works', () => {
      const out = formatMoney({ amount: 100, currency: 'EUR' })
      expect(out).toContain('1.00')
      expect(out).toMatch(/€|EUR/)
    })
  })
})
