/**
 * Tests for the agnostic `core/errors.ts` module — `PayError`,
 * `parsePayError`, `parsePayErrorCode`, and `payErrorFromResponse`.
 *
 * `parsePayError` replaces `@ezstart/api-sdk`'s `parseApiError` inside the
 * core layer; its priority order is replicated byte-for-byte so existing
 * message-string matching (e.g. `classifyPayError`) keeps working. The
 * `parseApiError` test cases (api-sdk) are mirrored here to pin that
 * equivalence, plus PayError-specific coverage (statusCode/code/details).
 */
import { describe, expect, it } from 'vitest'
import {
  PayError,
  parsePayError,
  parsePayErrorCode,
  payErrorFromResponse,
} from '../../core/errors.js'

describe('parsePayError', () => {
  it('returns null for null/undefined', () => {
    expect(parsePayError(null)).toBeNull()
    expect(parsePayError(undefined)).toBeNull()
  })

  it('returns null for empty object', () => {
    expect(parsePayError({})).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parsePayError('')).toBeNull()
  })

  it('extracts first Zod validation detail at root (priority 1)', () => {
    const payload = {
      success: false,
      error: 'Invalid request',
      details: [
        { message: 'Amount must be at least 1', path: ['amount'] },
        { message: 'Currency is required', path: ['currency'] },
      ],
    }
    expect(parsePayError(payload)).toBe('Amount must be at least 1')
  })

  it('extracts first Zod validation detail nested inside error envelope (priority 2)', () => {
    const payload = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: [{ path: ['email'], message: 'Field X required', code: 'invalid_string' }],
      },
    }
    expect(parsePayError(payload)).toBe('Field X required')
  })

  it('prefers nested error.details[0].message over nested error.message (priority 2 > 3)', () => {
    const payload = { error: { message: 'Generic', details: [{ message: 'Specific' }] } }
    expect(parsePayError(payload)).toBe('Specific')
  })

  it('falls through to nested error.message when nested error.details is empty (priority 3)', () => {
    const payload = { error: { message: 'Generic fallback', details: [] } }
    expect(parsePayError(payload)).toBe('Generic fallback')
  })

  it('extracts nested error.message (priority 3)', () => {
    const payload = { error: { message: 'Card declined', code: 'PAY_CARD_DECLINED' } }
    expect(parsePayError(payload)).toBe('Card declined')
  })

  it('extracts flat error string (priority 4)', () => {
    expect(parsePayError({ error: 'Invalid credentials' })).toBe('Invalid credentials')
  })

  it('extracts top-level message (priority 5)', () => {
    expect(parsePayError({ message: 'Payment not found' })).toBe('Payment not found')
  })

  it('returns primitive strings unchanged', () => {
    expect(parsePayError('Something broke')).toBe('Something broke')
  })

  it('never returns [object Object]', () => {
    const payload = { error: { nested: { value: 42 } } }
    expect(parsePayError(payload)).not.toContain('[object Object]')
  })

  it('falls back to generic message for unknown object shapes (priority 6)', () => {
    expect(parsePayError({ unexpected: 'field' })).toBe('An error occurred. Please try again.')
  })

  it('falls back to generic message for non-object, non-string primitives', () => {
    expect(parsePayError(42)).toBe('An error occurred. Please try again.')
    expect(parsePayError(true)).toBe('An error occurred. Please try again.')
  })
})

describe('parsePayErrorCode', () => {
  it('extracts top-level code', () => {
    expect(parsePayErrorCode({ code: 'PAY_CARD_DECLINED' })).toBe('PAY_CARD_DECLINED')
  })

  it('extracts nested error.code', () => {
    expect(parsePayErrorCode({ error: { code: 'RATE_LIMIT_EXCEEDED' } })).toBe(
      'RATE_LIMIT_EXCEEDED'
    )
  })

  it('prefers top-level code over nested error.code', () => {
    expect(parsePayErrorCode({ code: 'TOP', error: { code: 'NESTED' } })).toBe('TOP')
  })

  it('returns undefined when no code present', () => {
    expect(parsePayErrorCode({ error: 'oops' })).toBeUndefined()
    expect(parsePayErrorCode(null)).toBeUndefined()
    expect(parsePayErrorCode('string')).toBeUndefined()
    expect(parsePayErrorCode({ code: '' })).toBeUndefined()
  })
})

describe('PayError', () => {
  it('is an instance of Error (drop-in compatible with `err instanceof Error`)', () => {
    const err = new PayError('boom')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(PayError)
    expect(err.name).toBe('PayError')
    expect(err.message).toBe('boom')
  })

  it('defaults statusCode to 0 and code/details to undefined', () => {
    const err = new PayError('boom')
    expect(err.statusCode).toBe(0)
    expect(err.code).toBeUndefined()
    expect(err.details).toBeUndefined()
  })

  it('carries statusCode, code, and details', () => {
    const details = [{ message: 'Amount too small', path: ['amount'], code: 'too_small' }]
    const err = new PayError('Invalid', 422, { code: 'VALIDATION_ERROR', details })
    expect(err.statusCode).toBe(422)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.details).toEqual(details)
  })

  it('isPayError type guard narrows correctly', () => {
    expect(PayError.isPayError(new PayError('x'))).toBe(true)
    expect(PayError.isPayError(new Error('x'))).toBe(false)
    expect(PayError.isPayError('x')).toBe(false)
    expect(PayError.isPayError(null)).toBe(false)
  })
})

describe('payErrorFromResponse', () => {
  it('uses the parsed message and surfaces status/code/details', () => {
    const body = {
      error: {
        code: 'PAY_CARD_DECLINED',
        message: 'Your card was declined',
        details: [{ message: 'Insufficient funds', path: ['card'] }],
      },
    }
    const err = payErrorFromResponse(body, 402, 'Failed to charge')
    // Priority-2 detail wins for the message.
    expect(err.message).toBe('Insufficient funds')
    expect(err.statusCode).toBe(402)
    expect(err.code).toBe('PAY_CARD_DECLINED')
    expect(err.details).toEqual([{ message: 'Insufficient funds', path: ['card'] }])
  })

  it('falls back to the provided fallback when the body has no message (drop-in semantics)', () => {
    // Replicates the old `parseApiError(body) ?? fallback` behaviour exactly:
    // an empty object yields null → fallback used verbatim.
    const err = payErrorFromResponse({}, 500, 'Failed to create plan')
    expect(err.message).toBe('Failed to create plan')
    expect(err.statusCode).toBe(500)
    expect(err.code).toBeUndefined()
    expect(err.details).toBeUndefined()
  })

  it('falls back to the provided fallback for a nullish body', () => {
    const err = payErrorFromResponse(null, 0, 'Network failure')
    expect(err.message).toBe('Network failure')
    expect(err.statusCode).toBe(0)
  })

  it('extracts root-level details', () => {
    const body = {
      success: false,
      error: 'Invalid request',
      details: [{ message: 'Email is required', path: ['email'] }],
    }
    const err = payErrorFromResponse(body, 400, 'Failed')
    expect(err.message).toBe('Email is required')
    expect(err.details).toEqual([{ message: 'Email is required', path: ['email'] }])
  })

  it('produces a message classifiable by classifyPayError-style matching (401 → invalid-key)', () => {
    // The previous code threw `new Error('Unauthorized')`; classifyPayError
    // matches on the lowercased message. Ensure the message text is preserved.
    const err = payErrorFromResponse({ error: 'Unauthorized' }, 401, 'Failed to fetch payments')
    expect(err.message).toBe('Unauthorized')
    expect(/unauthori[sz]ed/.test(err.message.toLowerCase())).toBe(true)
  })
})
