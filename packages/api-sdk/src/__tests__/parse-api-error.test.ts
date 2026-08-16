import { describe, expect, it } from 'vitest'
import { parseApiError, parseApiErrorCode, parseRetryAfter } from '../core/parse-api-error.js'

describe('parseApiError', () => {
  it('returns null for null/undefined', () => {
    expect(parseApiError(null)).toBeNull()
    expect(parseApiError(undefined)).toBeNull()
  })

  it('returns null for empty object', () => {
    expect(parseApiError({})).toBeNull()
  })

  it('extracts nested error.message', () => {
    const payload = { error: { message: 'Invalid email', code: 'VALIDATION' } }
    expect(parseApiError(payload)).toBe('Invalid email')
  })

  it('extracts rate limit message with retryAfter', () => {
    const payload = {
      error: { message: 'Too many requests', code: 'RATE_LIMIT', retryAfter: '60' },
    }
    expect(parseApiError(payload)).toBe('Too many requests')
    expect(parseRetryAfter(payload)).toBe(60)
  })

  it('extracts first Zod validation detail message', () => {
    const payload = {
      success: false,
      error: 'Invalid request',
      details: [
        { message: 'Password must be at least 8 characters', path: ['newPassword'] },
        { message: 'Email is required', path: ['email'] },
      ],
    }
    expect(parseApiError(payload)).toBe('Password must be at least 8 characters')
  })

  it('extracts first Zod validation detail nested inside error envelope (HIGH-3)', () => {
    const payload = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: [{ path: ['email'], message: 'Field X required', code: 'invalid_string' }],
      },
    }
    expect(parseApiError(payload)).toBe('Field X required')
  })

  it('prefers nested error.details[0].message over nested error.message (HIGH-3)', () => {
    const payload = {
      error: {
        message: 'Generic',
        details: [{ message: 'Specific' }],
      },
    }
    expect(parseApiError(payload)).toBe('Specific')
  })

  it('falls through to nested error.message when nested error.details is empty (HIGH-3)', () => {
    const payload = {
      error: {
        message: 'Generic fallback',
        details: [],
      },
    }
    expect(parseApiError(payload)).toBe('Generic fallback')
  })

  it('extracts flat error string', () => {
    expect(parseApiError({ error: 'Invalid credentials' })).toBe('Invalid credentials')
  })

  it('extracts top-level message', () => {
    expect(parseApiError({ message: 'User not found' })).toBe('User not found')
  })

  it('returns primitive strings unchanged', () => {
    expect(parseApiError('Something broke')).toBe('Something broke')
  })

  it('never returns [object Object]', () => {
    const payload = { error: { nested: { value: 42 } } }
    const result = parseApiError(payload)
    expect(result).not.toContain('[object Object]')
  })

  it('falls back to generic message for unknown shapes', () => {
    expect(parseApiError({ unexpected: 'field' })).toBe('An error occurred. Please try again.')
  })
})

describe('parseApiErrorCode', () => {
  it('extracts top-level code', () => {
    expect(parseApiErrorCode({ code: 'INVALID_TOKEN' })).toBe('INVALID_TOKEN')
  })

  it('extracts nested error.code', () => {
    expect(parseApiErrorCode({ error: { code: 'RATE_LIMIT_EXCEEDED' } })).toBe(
      'RATE_LIMIT_EXCEEDED'
    )
  })

  it('returns undefined when no code present', () => {
    expect(parseApiErrorCode({ error: 'oops' })).toBeUndefined()
    expect(parseApiErrorCode(null)).toBeUndefined()
  })
})

describe('parseRetryAfter', () => {
  it('parses numeric retryAfter', () => {
    expect(parseRetryAfter({ retryAfter: 30 })).toBe(30)
  })

  it('parses nested retryAfter from string', () => {
    expect(parseRetryAfter({ error: { retryAfter: '120' } })).toBe(120)
  })

  it('returns undefined when not present', () => {
    expect(parseRetryAfter({})).toBeUndefined()
    expect(parseRetryAfter({ error: 'oops' })).toBeUndefined()
  })
})
