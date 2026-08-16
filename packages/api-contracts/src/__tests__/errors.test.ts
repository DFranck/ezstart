import { describe, expect, expectTypeOf, it } from 'vitest'
import { ErrorCode } from '../errors.js'

describe('ErrorCode', () => {
  it('uses identical string values and key names (no transformation)', () => {
    for (const [key, value] of Object.entries(ErrorCode)) {
      expect(value).toBe(key)
    }
  })

  it('exposes the expected codes', () => {
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED')
    expect(ErrorCode.INVALID_TOKEN).toBe('INVALID_TOKEN')
    expect(ErrorCode.INVALID_OR_EXPIRED_TOKEN).toBe('INVALID_OR_EXPIRED_TOKEN')
    expect(ErrorCode.EMAIL_NOT_VERIFIED).toBe('EMAIL_NOT_VERIFIED')
    expect(ErrorCode.TWO_FACTOR_REQUIRED).toBe('TWO_FACTOR_REQUIRED')
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN')
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND')
    expect(ErrorCode.ALREADY_EXISTS).toBe('ALREADY_EXISTS')
    expect(ErrorCode.CONFLICT).toBe('CONFLICT')
    expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED')
    expect(ErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR')
    expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
    expect(ErrorCode.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE')
  })

  it('exposes Wave-A2 codes (pay / webhook / idempotency / rate / maintenance / version / application)', () => {
    // Rate limiting (alias)
    expect(ErrorCode.RATE_LIMITED).toBe('RATE_LIMITED')

    // Maintenance
    expect(ErrorCode.MAINTENANCE_MODE).toBe('MAINTENANCE_MODE')

    // Application scoping
    expect(ErrorCode.APPLICATION_NOT_FOUND).toBe('APPLICATION_NOT_FOUND')
    expect(ErrorCode.APPLICATION_ACCESS_DENIED).toBe('APPLICATION_ACCESS_DENIED')

    // API versioning
    expect(ErrorCode.API_VERSION_INVALID).toBe('API_VERSION_INVALID')
    expect(ErrorCode.API_VERSION_UNSUPPORTED).toBe('API_VERSION_UNSUPPORTED')

    // Idempotency
    expect(ErrorCode.IDEMPOTENCY_KEY_INVALID).toBe('IDEMPOTENCY_KEY_INVALID')
    expect(ErrorCode.IDEMPOTENCY_KEY_REUSED).toBe('IDEMPOTENCY_KEY_REUSED')

    // Payments
    expect(ErrorCode.PAY_CARD_DECLINED).toBe('PAY_CARD_DECLINED')
    expect(ErrorCode.PAY_INSUFFICIENT_FUNDS).toBe('PAY_INSUFFICIENT_FUNDS')
    expect(ErrorCode.PAY_3DS_REQUIRED).toBe('PAY_3DS_REQUIRED')
    expect(ErrorCode.PAY_INVALID_PROMO).toBe('PAY_INVALID_PROMO')
    expect(ErrorCode.PAY_PROMO_EXHAUSTED).toBe('PAY_PROMO_EXHAUSTED')

    // Webhooks
    expect(ErrorCode.WEBHOOK_INVALID_SIGNATURE).toBe('WEBHOOK_INVALID_SIGNATURE')
    expect(ErrorCode.WEBHOOK_REPLAY_DETECTED).toBe('WEBHOOK_REPLAY_DETECTED')
  })

  it('has no value collisions across codes', () => {
    const values = Object.values(ErrorCode)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  it('is frozen / const-like — values are read-only at the type level', () => {
    // Compile-time: cannot assign a non-known string to the ErrorCode type.
    // This relies on the union type being `(typeof ErrorCode)[keyof typeof ErrorCode]`.
    expectTypeOf<ErrorCode>().toEqualTypeOf<
      | 'UNAUTHORIZED'
      | 'INVALID_TOKEN'
      | 'INVALID_OR_EXPIRED_TOKEN'
      | 'EMAIL_NOT_VERIFIED'
      | 'TWO_FACTOR_REQUIRED'
      | 'FORBIDDEN'
      | 'VALIDATION_ERROR'
      | 'NOT_FOUND'
      | 'ALREADY_EXISTS'
      | 'CONFLICT'
      | 'RATE_LIMIT_EXCEEDED'
      | 'RATE_LIMITED'
      | 'NETWORK_ERROR'
      | 'INTERNAL_ERROR'
      | 'SERVICE_UNAVAILABLE'
      | 'MAINTENANCE_MODE'
      | 'APPLICATION_NOT_FOUND'
      | 'APPLICATION_ACCESS_DENIED'
      | 'API_VERSION_INVALID'
      | 'API_VERSION_UNSUPPORTED'
      | 'IDEMPOTENCY_KEY_INVALID'
      | 'IDEMPOTENCY_KEY_REUSED'
      | 'PAY_CARD_DECLINED'
      | 'PAY_INSUFFICIENT_FUNDS'
      | 'PAY_3DS_REQUIRED'
      | 'PAY_INVALID_PROMO'
      | 'PAY_PROMO_EXHAUSTED'
      | 'WEBHOOK_INVALID_SIGNATURE'
      | 'WEBHOOK_REPLAY_DETECTED'
    >()
  })

  it('accepts ErrorCode values where ErrorCode is expected (positive test)', () => {
    const code: ErrorCode = ErrorCode.RATE_LIMIT_EXCEEDED
    expect(code).toBe('RATE_LIMIT_EXCEEDED')
  })
})
