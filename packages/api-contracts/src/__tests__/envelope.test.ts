import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  isErrorResponse,
  isSuccessResponse,
  type ErrorResponse,
  type SuccessResponse,
} from '../envelope.js'

describe('isSuccessResponse', () => {
  it('returns true for well-formed success envelopes', () => {
    expect(isSuccessResponse({ success: true, data: {} })).toBe(true)
    expect(isSuccessResponse({ success: true, data: null })).toBe(true)
    expect(isSuccessResponse({ success: true, data: [1, 2, 3], meta: { total: 3 } })).toBe(true)
  })

  it('returns false for failure envelopes', () => {
    expect(isSuccessResponse({ success: false, error: 'boom' })).toBe(false)
    expect(isSuccessResponse({ success: false, error: { message: 'boom' } })).toBe(false)
  })

  it('returns false for non-object / missing success', () => {
    expect(isSuccessResponse(null)).toBe(false)
    expect(isSuccessResponse(undefined)).toBe(false)
    expect(isSuccessResponse('ok')).toBe(false)
    expect(isSuccessResponse(42)).toBe(false)
    expect(isSuccessResponse([])).toBe(false)
    expect(isSuccessResponse({})).toBe(false)
    expect(isSuccessResponse({ data: 'x' })).toBe(false)
  })

  it('returns false when success is truthy but not === true', () => {
    expect(isSuccessResponse({ success: 1 })).toBe(false)
    expect(isSuccessResponse({ success: 'true' })).toBe(false)
  })

  it('narrows the type inside the guard', () => {
    const body: unknown = { success: true, data: { id: 'u_1' } }
    if (isSuccessResponse<{ id: string }>(body)) {
      expectTypeOf(body).toEqualTypeOf<SuccessResponse<{ id: string }>>()
      expectTypeOf(body.data.id).toBeString()
    }
  })
})

describe('isErrorResponse', () => {
  it('returns true for well-formed failure envelopes (object error)', () => {
    expect(isErrorResponse({ success: false, error: { message: 'nope' } })).toBe(true)
  })

  it('returns true for legacy string-error envelopes (back-compat)', () => {
    expect(isErrorResponse({ success: false, error: 'nope' })).toBe(true)
  })

  it('returns false for success envelopes', () => {
    expect(isErrorResponse({ success: true, data: {} })).toBe(false)
  })

  it('returns false for non-object / missing success', () => {
    expect(isErrorResponse(null)).toBe(false)
    expect(isErrorResponse(undefined)).toBe(false)
    expect(isErrorResponse('error')).toBe(false)
    expect(isErrorResponse(0)).toBe(false)
    expect(isErrorResponse([])).toBe(false)
    expect(isErrorResponse({})).toBe(false)
  })

  it('returns false when success is falsy but not === false', () => {
    expect(isErrorResponse({ success: 0 })).toBe(false)
    expect(isErrorResponse({ success: null })).toBe(false)
    expect(isErrorResponse({ success: undefined })).toBe(false)
  })

  it('narrows the type inside the guard', () => {
    const body: unknown = { success: false, error: { message: 'nope', code: 'NOT_FOUND' } }
    if (isErrorResponse(body)) {
      expectTypeOf(body).toEqualTypeOf<ErrorResponse>()
      // error may be string | ErrorPayload — discriminate
      if (typeof body.error !== 'string') {
        expectTypeOf(body.error.message).toBeString()
      }
    }
  })
})
