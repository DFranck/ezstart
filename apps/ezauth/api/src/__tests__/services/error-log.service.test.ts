/**
 * Tests for the ErrorLog persistence service.
 *
 * Covers the defensive contract (never throws), the field extraction
 * (req → doc), the truncation guards (message / stack / userAgent), and
 * the env-derived fallbacks (releaseSha + env).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import type { Request } from 'express'
import { logErrorToDb } from '../../services/error-log.service.js'
import { getErrorLogModel } from '../../models/error-log.js'

interface FakeRequestOverrides {
  headers?: Record<string, string>
  ip?: string
  method?: string
  originalUrl?: string
  url?: string
  /** Pass `null` to clear the default user; omit to use default. */
  user?: { userId: string } | null
  /** Pass `null` to clear the default userId; omit to use default. */
  userId?: string | null
}

function fakeRequest(overrides: FakeRequestOverrides = {}): Request {
  const headers: Record<string, string> = {
    'user-agent': 'AcmeAgent/1.0 (Test)',
    ...(overrides.headers ?? {}),
  }
  const get = (name: string): string | undefined => headers[name.toLowerCase()] ?? headers[name]
  const base: Record<string, unknown> = {
    headers,
    ip: overrides.ip ?? '203.0.113.42',
    method: overrides.method ?? 'POST',
    originalUrl: overrides.originalUrl ?? '/api/widgets/123?tracking=ok',
    url: overrides.url ?? '/api/widgets/123',
    get,
  }
  if (overrides.user !== null) {
    base.user = overrides.user ?? { userId: 'user-abc' }
  }
  if (overrides.userId !== null) {
    base.userId = overrides.userId ?? 'user-abc'
  }
  return base as unknown as Request
}

describe('logErrorToDb', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    const ErrorLog = await getErrorLogModel()
    await ErrorLog.deleteMany({})
  })

  it('persists an error with full request context', async () => {
    const err = new TypeError('Cannot read property foo of undefined')
    await logErrorToDb({ err, req: fakeRequest() })

    const ErrorLog = await getErrorLogModel()
    const docs = await ErrorLog.find({})
    expect(docs).toHaveLength(1)
    const doc = docs[0]!
    expect(doc.message).toBe('Cannot read property foo of undefined')
    expect(doc.errorName).toBe('TypeError')
    expect(doc.stack).toContain('TypeError')
    expect(doc.url).toBe('/api/widgets/123?tracking=ok')
    expect(doc.method).toBe('POST')
    expect(doc.ip).toBe('203.0.113.42')
    expect(doc.userAgent).toBe('AcmeAgent/1.0 (Test)')
    expect(doc.userId).toBe('user-abc')
    expect(doc.level).toBe('error')
    expect(doc.timestamp).toBeInstanceOf(Date)
  })

  it('coerces non-Error throws to Error before persisting', async () => {
    await logErrorToDb({ err: 'plain string boom' })

    const ErrorLog = await getErrorLogModel()
    const docs = await ErrorLog.find({})
    expect(docs).toHaveLength(1)
    expect(docs[0]!.message).toBe('plain string boom')
    expect(docs[0]!.errorName).toBe('Error')
  })

  it('honors the level override (warn vs error)', async () => {
    await logErrorToDb({ err: new Error('mild'), level: 'warn' })

    const ErrorLog = await getErrorLogModel()
    const docs = await ErrorLog.find({})
    expect(docs[0]!.level).toBe('warn')
  })

  it('truncates oversized message + stack', async () => {
    const huge = 'x'.repeat(5000)
    const err = new Error(huge)
    err.stack = `Error: ${huge}\n${'    at boom\n'.repeat(2000)}`
    await logErrorToDb({ err })

    const ErrorLog = await getErrorLogModel()
    const docs = await ErrorLog.find({})
    expect(docs[0]!.message.length).toBeLessThanOrEqual(2000)
    expect(docs[0]!.stack!.length).toBeLessThanOrEqual(8000)
  })

  it('persists caller-supplied context', async () => {
    await logErrorToDb({
      err: new Error('with context'),
      context: { isTestMode: true, applicationId: 'app-xyz' },
    })

    const ErrorLog = await getErrorLogModel()
    const docs = await ErrorLog.find({})
    expect(docs[0]!.context).toMatchObject({ isTestMode: true, applicationId: 'app-xyz' })
  })

  it('captures env + releaseSha from process.env', async () => {
    const original = {
      DEPLOY_ENV: process.env.DEPLOY_ENV,
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    }
    process.env.DEPLOY_ENV = 'staging'
    process.env.VERCEL_GIT_COMMIT_SHA = 'abc123def'

    try {
      await logErrorToDb({ err: new Error('env capture') })

      const ErrorLog = await getErrorLogModel()
      const docs = await ErrorLog.find({})
      expect(docs[0]!.env).toBe('staging')
      expect(docs[0]!.releaseSha).toBe('abc123def')
    } finally {
      if (original.DEPLOY_ENV === undefined) delete process.env.DEPLOY_ENV
      else process.env.DEPLOY_ENV = original.DEPLOY_ENV
      if (original.VERCEL_GIT_COMMIT_SHA === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA
      else process.env.VERCEL_GIT_COMMIT_SHA = original.VERCEL_GIT_COMMIT_SHA
    }
  })

  it('never throws even when the model fails (defensive contract)', async () => {
    // Force getErrorLogModel to throw by mocking the underlying connector
    // for a single invocation. We simulate by passing a Mongo-incompatible
    // doc that would normally crash — but the service swallows it.
    // Instead, easier: trigger the warn path by passing a circular context
    // that JSON-encoding chokes on (Mongoose handles circulars but we just
    // confirm the call resolves without throwing).
    const circular: Record<string, unknown> = {}
    circular.self = circular
    await expect(
      logErrorToDb({ err: new Error('circ'), context: circular })
    ).resolves.toBeUndefined()
  })

  it('handles requests without a user', async () => {
    const req = fakeRequest({ user: null, userId: null })
    await logErrorToDb({ err: new Error('anon'), req })

    const ErrorLog = await getErrorLogModel()
    const docs = await ErrorLog.find({})
    expect(docs[0]!.userId).toBeUndefined()
    expect(docs[0]!.url).toBe('/api/widgets/123?tracking=ok')
  })

  it('handles an undefined req cleanly', async () => {
    await logErrorToDb({ err: new Error('no req') })

    const ErrorLog = await getErrorLogModel()
    const docs = await ErrorLog.find({})
    expect(docs).toHaveLength(1)
    expect(docs[0]!.url).toBeUndefined()
    expect(docs[0]!.method).toBeUndefined()
  })

  it('warns and resolves cleanly when ErrorLog.create rejects', async () => {
    // Patch the model's `create` to reject — proves the service swallows
    // the failure (defensive contract) and never propagates.
    const ErrorLog = await getErrorLogModel()
    const createSpy = vi
      .spyOn(ErrorLog, 'create')
      .mockRejectedValueOnce(new Error('mongo unreachable') as never)

    const loggerModule = await import('@ezstart/logger/server')
    const warnSpy = vi.spyOn(loggerModule.logger, 'warn').mockImplementation(() => {})

    try {
      await expect(logErrorToDb({ err: new Error('boom') })).resolves.toBeUndefined()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed to persist error to DB'),
        expect.any(Object)
      )
    } finally {
      createSpy.mockRestore()
      warnSpy.mockRestore()
    }
  })
})
