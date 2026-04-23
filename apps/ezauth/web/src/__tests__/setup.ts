import * as matchers from '@testing-library/jest-dom/matchers'
import { expect, vi } from 'vitest'

expect.extend(matchers)

// ---------------------------------------------------------------------------
// Mock @ezstart/api-sdk (apiCall + ApiError)
// ---------------------------------------------------------------------------
vi.mock('@ezstart/api-sdk', () => {
  class MockApiError extends Error {
    status: number
    code?: string | undefined
    retryAfter?: number | undefined
    data?: unknown

    constructor(
      message: string,
      opts: { status: number; code?: string; retryAfter?: number; data?: unknown } = {
        status: 0,
      }
    ) {
      super(message)
      this.name = 'ApiError'
      this.status = opts.status
      this.code = opts.code
      this.retryAfter = opts.retryAfter
      this.data = opts.data
    }

    static isApiError(value: unknown): value is MockApiError {
      return value instanceof MockApiError
    }
  }

  return {
    apiCall: vi.fn(),
    ApiError: MockApiError,
  }
})
