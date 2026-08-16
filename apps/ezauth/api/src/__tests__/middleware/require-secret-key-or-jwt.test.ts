/**
 * Unit tests for the `requireSecretKeyOrJwt` middleware.
 *
 * Closes AUTH-SVC-ADMIN-ROUTES-PUBLISHABLE-KEY-LEAK-001: the publishable
 * scope=admin self-key must be rejected on admin endpoints, while the JWT
 * path and secret-key S2S path stay open.
 *
 * Coverage:
 *   (a) no apiKeyId (JWT path)          → next() called, no error response
 *   (b) apiKeyType 'secret'             → next() called
 *   (c) apiKeyType 'publishable'        → 403, next() NOT called
 *   (d) apiKeyType undefined (legacy)   → 403, next() NOT called
 */
import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import { requireSecretKeyOrJwt } from '../../middleware/require-secret-key-or-jwt.js'

interface MockResponse {
  statusCode: number
  body: unknown
  status: (code: number) => MockResponse
  json: (payload: unknown) => MockResponse
}

function createMockRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
  return res
}

function run(reqFields: { apiKeyId?: string; apiKeyType?: 'publishable' | 'secret' }) {
  const req = reqFields as unknown as Request
  const res = createMockRes()
  const next = vi.fn()
  requireSecretKeyOrJwt(req, res as unknown as Response, next)
  return { res, next }
}

describe('requireSecretKeyOrJwt', () => {
  it('(a) no apiKeyId — JWT path — calls next() without responding', () => {
    const { res, next } = run({})
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(0)
  })

  it("(b) apiKeyType 'secret' — calls next()", () => {
    const { res, next } = run({ apiKeyId: 'key_123', apiKeyType: 'secret' })
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(0)
  })

  it("(c) apiKeyType 'publishable' — 403, does NOT call next()", () => {
    const { res, next } = run({ apiKeyId: 'key_pub', apiKeyType: 'publishable' })
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(403)
    expect(res.body).toMatchObject({ success: false })
    const body = res.body as { error: { message: string } }
    expect(body.error.message).toMatch(/secret API key/i)
  })

  it('(d) apiKeyType undefined (legacy ezk_*) — 403, does NOT call next()', () => {
    const { res, next } = run({ apiKeyId: 'key_legacy' })
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(403)
    const body = res.body as { error: { message: string } }
    expect(body.error.message).toMatch(/secret API key/i)
  })
})
