import { describe, expect, it } from 'vitest'
import { ApiError } from '../../core/api-error.js'
import { parseApiError, parseApiErrorCode, parseRetryAfter } from '../../core/parse-api-error.js'

describe('parseApiError security', () => {
  // VULN-14: Deeply nested error (stack overflow attempt)
  it('deeply nested error object does not crash', () => {
    // parseApiError only goes 1 level deep (payload.error.message)
    // It does NOT recurse, so deeply nested objects are safe
    let obj: Record<string, unknown> = { message: 'deep' }
    for (let i = 0; i < 1000; i++) {
      obj = { error: obj }
    }
    // Should extract from first level only, find error is an object,
    // look for error.message — which is another object, not a string
    const result = parseApiError(obj)
    // Falls through to generic message since error.message is not a string
    expect(result).toBe('An error occurred. Please try again.')
  })

  // VULN-14b: Circular reference in error object
  it('circular reference does not crash parseApiError', () => {
    const obj: Record<string, unknown> = { message: 'test' }
    obj.self = obj
    // parseApiError does not stringify or recurse — direct property access only
    expect(parseApiError(obj)).toBe('test')
  })

  // VULN-14c: Prototype pollution attempt
  it('__proto__ in error payload is not dangerous', () => {
    const payload = JSON.parse('{"__proto__": {"isAdmin": true}, "message": "test"}')
    expect(parseApiError(payload)).toBe('test')
    // Verify prototype was not polluted
    expect(({} as Record<string, unknown>).isAdmin).toBeUndefined()
  })

  // VULN-14d: toString override
  it('object with custom toString does not affect parsing', () => {
    const payload = {
      toString: () => 'evil',
      message: 'legit',
    }
    expect(parseApiError(payload)).toBe('legit')
  })

  // Edge: Array as error payload
  it('array payload falls through to generic message', () => {
    expect(parseApiError([1, 2, 3])).toBe('An error occurred. Please try again.')
  })

  // Edge: Number as error payload
  it('number payload returns generic message', () => {
    expect(parseApiError(42)).toBe('An error occurred. Please try again.')
  })

  // Edge: Boolean as error payload
  it('boolean payload returns generic message', () => {
    expect(parseApiError(true)).toBe('An error occurred. Please try again.')
  })
})

describe('ApiError.isApiError type guard security', () => {
  // VULN-15: Crafted object that mimics ApiError
  it('plain object with name "ApiError" does NOT pass isApiError', () => {
    const fake = {
      name: 'ApiError',
      message: 'fake',
      status: 401,
      code: 'FAKE',
    }
    // isApiError uses instanceof, not duck typing
    expect(ApiError.isApiError(fake)).toBe(false)
  })

  // VULN-15b: Object.create(ApiError.prototype) DOES pass
  it('Object.create(ApiError.prototype) passes isApiError', () => {
    const crafted = Object.create(ApiError.prototype)
    crafted.message = 'crafted'
    crafted.status = 999
    // FINDING: This passes because instanceof checks prototype chain
    // This is standard JS behavior and not exploitable in practice
    expect(ApiError.isApiError(crafted)).toBe(true)
  })

  // VULN-15c: null/undefined
  it('null and undefined do not pass isApiError', () => {
    expect(ApiError.isApiError(null)).toBe(false)
    expect(ApiError.isApiError(undefined)).toBe(false)
  })

  // VULN-15d: Regular Error does not pass
  it('regular Error does not pass isApiError', () => {
    expect(ApiError.isApiError(new Error('test'))).toBe(false)
  })
})

describe('parseApiErrorCode security', () => {
  it('code with special characters is returned as-is', () => {
    expect(parseApiErrorCode({ code: '<script>alert(1)</script>' })).toBe(
      '<script>alert(1)</script>'
    )
  })

  it('code as number is ignored (only string accepted)', () => {
    expect(parseApiErrorCode({ code: 42 })).toBeUndefined()
  })
})

describe('parseRetryAfter security', () => {
  it('retryAfter as string number is parsed', () => {
    expect(parseRetryAfter({ retryAfter: '60' })).toBe(60)
  })

  it('retryAfter as non-numeric string is ignored', () => {
    expect(parseRetryAfter({ retryAfter: 'never' })).toBeUndefined()
  })

  it('retryAfter: 0 is valid', () => {
    expect(parseRetryAfter({ retryAfter: 0 })).toBe(0)
  })
})
