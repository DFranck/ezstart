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
      | 'NETWORK_ERROR'
      | 'INTERNAL_ERROR'
      | 'SERVICE_UNAVAILABLE'
    >()
  })

  it('accepts ErrorCode values where ErrorCode is expected (positive test)', () => {
    const code: ErrorCode = ErrorCode.RATE_LIMIT_EXCEEDED
    expect(code).toBe('RATE_LIMIT_EXCEEDED')
  })
})
