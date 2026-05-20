/**
 * EMAIL_VERIFICATION_REQUIRED — client-side error-code propagation.
 *
 * The server gate `requireEmailVerified` (`@ezstart/auth-sdk/server`) returns
 * `403 { success: false, error: { message, code: 'EMAIL_VERIFICATION_REQUIRED' } }`
 * on privileged routes. These tests pin that:
 *
 *  1. The exported `EMAIL_VERIFICATION_REQUIRED` constant stays in sync with
 *     the server-side `EMAIL_VERIFICATION_REQUIRED_CODE`.
 *  2. `CoreAuthClient` threads the response `error.code` into `AuthError.code`
 *     (so the code reaches consumers — previously it was dropped).
 *  3. `isEmailVerificationRequiredError()` narrows the caught error so
 *     consumers can switch on it instead of brittle message matching.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CoreAuthClient } from '../../core/auth-client.js'
import {
  AuthError,
  EMAIL_VERIFICATION_REQUIRED,
  isEmailVerificationRequiredError,
} from '../../core/errors.js'
import { EMAIL_VERIFICATION_REQUIRED_CODE } from '../../server/require-email-verified.js'

const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('EMAIL_VERIFICATION_REQUIRED error code', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('constant matches the server-side code (single source of truth)', () => {
    expect(EMAIL_VERIFICATION_REQUIRED).toBe('EMAIL_VERIFICATION_REQUIRED')
    expect(EMAIL_VERIFICATION_REQUIRED).toBe(EMAIL_VERIFICATION_REQUIRED_CODE)
  })

  it('threads error.code from the 403 envelope into AuthError.code', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(403, {
        success: false,
        error: { message: 'Email verification required', code: EMAIL_VERIFICATION_REQUIRED },
      })
    )

    const client = new CoreAuthClient({
      apiUrl: 'https://auth.example.com/api/auth',
      appName: 'myapp',
    })

    await expect(
      client.changePassword({ currentPassword: 'old', newPassword: 'a-new-strong-password' })
    ).rejects.toMatchObject({
      name: 'AuthError',
      status: 403,
      code: EMAIL_VERIFICATION_REQUIRED,
      message: 'Email verification required',
    })
  })

  it('isEmailVerificationRequiredError narrows the caught error', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(403, {
        success: false,
        error: { message: 'Email verification required', code: EMAIL_VERIFICATION_REQUIRED },
      })
    )

    const client = new CoreAuthClient({
      apiUrl: 'https://auth.example.com/api/auth',
      appName: 'myapp',
    })

    let caught: unknown
    try {
      await client.deleteAccount({ confirmation: 'user@example.com' })
    } catch (err) {
      caught = err
    }

    expect(isEmailVerificationRequiredError(caught)).toBe(true)
  })

  it('does not false-positive on other AuthError codes', () => {
    expect(isEmailVerificationRequiredError(new AuthError('boom', 403, 'SOME_OTHER_CODE'))).toBe(
      false
    )
    expect(isEmailVerificationRequiredError(new AuthError('boom', 403))).toBe(false)
    expect(isEmailVerificationRequiredError(new Error('not an AuthError'))).toBe(false)
    expect(isEmailVerificationRequiredError(null)).toBe(false)
    expect(isEmailVerificationRequiredError({ code: EMAIL_VERIFICATION_REQUIRED })).toBe(false)
  })

  it('leaves AuthError.code undefined when the server returns no code', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(400, { success: false, error: { message: 'Bad request' } })
    )

    const client = new CoreAuthClient({
      apiUrl: 'https://auth.example.com/api/auth',
      appName: 'myapp',
    })

    let caught: unknown
    try {
      await client.changePassword({ newPassword: 'x' })
    } catch (err) {
      caught = err
    }

    expect(AuthError.isAuthError(caught)).toBe(true)
    expect((caught as AuthError).code).toBeUndefined()
    expect(isEmailVerificationRequiredError(caught)).toBe(false)
  })
})
