import { describe, expect, it } from 'vitest'
import { ApiError } from '../api-error.js'
import { ErrorCode } from '../errors.js'

describe('ApiError', () => {
  describe('constructor', () => {
    it('sets message + status (minimum required)', () => {
      const err = new ApiError('boom', { status: 500 })
      expect(err.message).toBe('boom')
      expect(err.status).toBe(500)
      expect(err.code).toBeUndefined()
      expect(err.data).toBeUndefined()
      expect(err.retryAfter).toBeUndefined()
    })

    it('sets all optional fields when provided', () => {
      const err = new ApiError('rate limited', {
        status: 429,
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        data: { hint: 'slow down' },
        retryAfter: 60,
      })
      expect(err.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(err.data).toEqual({ hint: 'slow down' })
      expect(err.retryAfter).toBe(60)
    })

    it('uses status 0 for network errors', () => {
      const err = new ApiError('fetch failed', { status: 0, code: ErrorCode.NETWORK_ERROR })
      expect(err.status).toBe(0)
      expect(err.code).toBe('NETWORK_ERROR')
    })

    it('sets name to "ApiError" (not "Error")', () => {
      const err = new ApiError('x', { status: 400 })
      expect(err.name).toBe('ApiError')
    })

    it('exposes fields as readonly at the type level', () => {
      const err = new ApiError('x', { status: 400 })
      // @ts-expect-error — readonly status
      ;() => (err.status = 500)
    })
  })

  describe('inheritance', () => {
    it('is an instance of Error', () => {
      const err = new ApiError('x', { status: 400 })
      expect(err).toBeInstanceOf(Error)
    })

    it('is an instance of ApiError', () => {
      const err = new ApiError('x', { status: 400 })
      expect(err).toBeInstanceOf(ApiError)
    })

    it('preserves prototype across throw / catch boundary', () => {
      try {
        throw new ApiError('x', { status: 404, code: ErrorCode.NOT_FOUND })
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError)
        expect(e).toBeInstanceOf(Error)
      }
    })

    it('captures a stack trace', () => {
      const err = new ApiError('x', { status: 400 })
      expect(err.stack).toBeDefined()
      expect(typeof err.stack).toBe('string')
    })
  })

  describe('isApiError guard', () => {
    it('returns true for ApiError instances', () => {
      const err = new ApiError('x', { status: 400 })
      expect(ApiError.isApiError(err)).toBe(true)
    })

    it('returns false for plain Error', () => {
      const err = new Error('x')
      expect(ApiError.isApiError(err)).toBe(false)
    })

    it('returns false for null / undefined', () => {
      expect(ApiError.isApiError(null)).toBe(false)
      expect(ApiError.isApiError(undefined)).toBe(false)
    })

    it('returns false for shape-only impostors', () => {
      const fake = { name: 'ApiError', message: 'x', status: 400 }
      expect(ApiError.isApiError(fake)).toBe(false)
    })

    it('narrows the type in TypeScript', () => {
      const value: unknown = new ApiError('x', { status: 400, code: 'X' })
      if (ApiError.isApiError(value)) {
        // value is ApiError here — accessing fields must compile
        expect(value.status).toBe(400)
        expect(value.code).toBe('X')
      } else {
        throw new Error('isApiError should have returned true')
      }
    })
  })
})
