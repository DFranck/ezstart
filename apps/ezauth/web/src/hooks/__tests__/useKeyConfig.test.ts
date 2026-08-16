import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { apiCall, ApiError } from '@ezstart/api-sdk'
import { useKeyConfig } from '../useKeyConfig'

const mockedApiCall = vi.mocked(apiCall)

describe('useKeyConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns idle state when no publishable key is provided', () => {
    const { result } = renderHook(() => useKeyConfig(undefined))

    expect(result.current.status).toBe('idle')
    expect(result.current.appName).toBeUndefined()
    expect(result.current.scope).toBeUndefined()
    expect(result.current.httpStatus).toBeUndefined()
    expect(result.current.retryAfter).toBeUndefined()
    expect(mockedApiCall).not.toHaveBeenCalled()
  })

  it('transitions to valid when the API resolves successfully', async () => {
    mockedApiCall.mockResolvedValueOnce({ appName: 'ezpay', scope: 'user' })

    const { result } = renderHook(() => useKeyConfig('ez_pk_live_abc'))

    expect(result.current.status).toBe('loading')

    await waitFor(() => {
      expect(result.current.status).toBe('valid')
    })

    expect(result.current.appName).toBe('ezpay')
    expect(result.current.scope).toBe('user')
    expect(result.current.httpStatus).toBe(200)
  })

  it('maps a 429 rate-limit response to status="rate_limited" (NOT invalid)', async () => {
    mockedApiCall.mockRejectedValueOnce(
      new ApiError('Too many requests', {
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 5,
      })
    )

    const { result } = renderHook(() => useKeyConfig('ez_pk_live_rate'))

    await waitFor(() => {
      expect(result.current.status).toBe('rate_limited')
    })

    expect(result.current.httpStatus).toBe(429)
    expect(result.current.retryAfter).toBe(5)
    expect(result.current.errorMessage).toBe('Too many requests')
    expect(result.current.appName).toBeUndefined()
  })

  it('maps a 401 unauthorized response to status="invalid" with the server message', async () => {
    mockedApiCall.mockRejectedValueOnce(
      new ApiError('Invalid or expired API key', {
        status: 401,
        code: 'UNAUTHORIZED',
      })
    )

    const { result } = renderHook(() => useKeyConfig('ez_pk_live_bad'))

    await waitFor(() => {
      expect(result.current.status).toBe('invalid')
    })

    expect(result.current.httpStatus).toBe(401)
    expect(result.current.errorMessage).toBe('Invalid or expired API key')
    expect(result.current.retryAfter).toBeUndefined()
  })

  it('maps a 5xx server error to status="error" (transient)', async () => {
    mockedApiCall.mockRejectedValueOnce(
      new ApiError('Internal server error', {
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
      })
    )

    const { result } = renderHook(() => useKeyConfig('ez_pk_live_5xx'))

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    expect(result.current.httpStatus).toBe(503)
  })

  it('maps a network error (status 0) to status="error"', async () => {
    mockedApiCall.mockRejectedValueOnce(
      new ApiError('Network error', { status: 0, code: 'NETWORK_ERROR' })
    )

    const { result } = renderHook(() => useKeyConfig('ez_pk_live_net'))

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    expect(result.current.httpStatus).toBe(0)
  })

  it('re-fetches when the retryNonce changes', async () => {
    mockedApiCall
      .mockRejectedValueOnce(
        new ApiError('Too many requests', {
          status: 429,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 1,
        })
      )
      .mockResolvedValueOnce({ appName: 'ezauth', scope: 'user' })

    const { result, rerender } = renderHook(
      ({ nonce }: { nonce: number }) => useKeyConfig('ez_pk_live_retry', nonce),
      { initialProps: { nonce: 0 } }
    )

    await waitFor(() => {
      expect(result.current.status).toBe('rate_limited')
    })

    rerender({ nonce: 1 })

    await waitFor(() => {
      expect(result.current.status).toBe('valid')
    })

    expect(result.current.appName).toBe('ezauth')
    expect(mockedApiCall).toHaveBeenCalledTimes(2)
  })
})
