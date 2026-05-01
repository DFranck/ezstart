/**
 * Tests for `requireEmailVerified` — composable Express gate that returns
 * 403 + `code: 'EMAIL_VERIFICATION_REQUIRED'` when the authenticated
 * `req.user.isVerified !== true`.
 *
 * The gate is meant to be chained AFTER an upstream auth middleware that
 * hydrates `req.user` (e.g. `verifyTokenMiddleware`, `rbacRequireAuth`,
 * or the SDK's own `createAuthMiddleware`).
 */

import { describe, expect, it, vi } from 'vitest'
import {
  requireEmailVerified,
  EMAIL_VERIFICATION_REQUIRED_CODE,
} from '../../server/require-email-verified.js'

interface MockRes {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
}

function makeRes(): MockRes {
  const res: MockRes = {
    status: vi.fn(),
    json: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

describe('requireEmailVerified', () => {
  it('exports the constant code so consumers can match on it', () => {
    expect(EMAIL_VERIFICATION_REQUIRED_CODE).toBe('EMAIL_VERIFICATION_REQUIRED')
  })

  it('calls next() when req.user.isVerified === true', () => {
    const req = { user: { _id: 'u1', email: 'alice@example.com', isVerified: true } } as never
    const res = makeRes()
    const next = vi.fn()
    requireEmailVerified(req, res as never, next)
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  it('returns 401 when req.user is missing (upstream auth not chained)', () => {
    const req = {} as never
    const res = makeRes()
    const next = vi.fn()
    requireEmailVerified(req, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Authentication required' }),
      })
    )
  })

  it('returns 403 with EMAIL_VERIFICATION_REQUIRED when isVerified === false', () => {
    const req = { user: { _id: 'u2', email: 'bob@example.com', isVerified: false } } as never
    const res = makeRes()
    const next = vi.fn()
    requireEmailVerified(req, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Email verification required',
          code: 'EMAIL_VERIFICATION_REQUIRED',
        }),
      })
    )
  })

  it('returns 403 when isVerified is undefined (defensive — partially-hydrated user)', () => {
    const req = { user: { _id: 'u3', email: 'carol@example.com' } } as never
    const res = makeRes()
    const next = vi.fn()
    requireEmailVerified(req, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'EMAIL_VERIFICATION_REQUIRED' }),
      })
    )
  })

  it('returns 403 when isVerified is a truthy non-boolean (defensive — only === true passes)', () => {
    // JWT payloads sometimes hydrate `isVerified` as a string "true" rather
    // than the boolean `true`. The gate intentionally rejects those — only
    // strict `true` is accepted, mirroring Clerk's `email_verified` claim
    // strict-equality check.
    const req = { user: { _id: 'u4', email: 'dave@example.com', isVerified: 'true' } } as never
    const res = makeRes()
    const next = vi.fn()
    requireEmailVerified(req, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'EMAIL_VERIFICATION_REQUIRED' }),
      })
    )
  })

  it('returns 403 when isVerified is null', () => {
    const req = { user: { _id: 'u5', email: 'eve@example.com', isVerified: null } } as never
    const res = makeRes()
    const next = vi.fn()
    requireEmailVerified(req, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('attaches a structured error envelope (message + code, no extra fields)', () => {
    const req = { user: { _id: 'u6', email: 'frank@example.com', isVerified: false } } as never
    const res = makeRes()
    requireEmailVerified(req, res as never, vi.fn())
    const payload = res.json.mock.calls[0]?.[0] as { error: Record<string, unknown> }
    expect(payload.error).toEqual({
      message: 'Email verification required',
      code: 'EMAIL_VERIFICATION_REQUIRED',
    })
  })
})
