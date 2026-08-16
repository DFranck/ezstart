/**
 * Tests for the Sentry init helper.
 *
 * Validates the **DSN-less safe** contract: callers must be able to invoke
 * `initSentry({ serviceName: 'foo' })` regardless of env config — no DSN
 * means no-op, never throw.
 *
 * Also validates that:
 * - When a DSN is provided, `Sentry.init` is called with the expected config.
 * - `captureException` never throws even when Sentry is not initialized
 *   (defensive — a broken Sentry transport must never crash the request).
 * - ZERO auto-integrations are passed (cf. 2026-04-25 OTEL/CORS incident).
 *
 * NOTE: in ESM, `@sentry/node-core` exports are read-only — we use `vi.mock`
 * to intercept the module instead of `vi.spyOn` on the namespace import.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @sentry/node-core BEFORE importing the helper so the module under
// test resolves to the mocked module. Hoisted by vitest automatically.
const initMock = vi.fn()
const captureExceptionMock = vi.fn()

vi.mock('@sentry/node-core', () => ({
  init: initMock,
  captureException: captureExceptionMock,
}))

// Import AFTER the mock so the helper sees mocked Sentry.
const { captureException, initSentry } = await import('../../observability/sentry-init.js')

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  // Reset env between tests to avoid cross-test bleed.
  process.env = { ...ORIGINAL_ENV }
  delete process.env.SENTRY_DSN
  delete process.env.DEPLOY_ENV
  delete process.env.VERCEL_GIT_COMMIT_SHA
  delete process.env.RAILWAY_GIT_COMMIT_SHA
  initMock.mockReset()
  captureExceptionMock.mockReset()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('initSentry — DSN-less safety', () => {
  it('is a no-op when SENTRY_DSN is unset and no dsn opt provided', () => {
    initSentry({ serviceName: 'test-app' })

    expect(initMock).not.toHaveBeenCalled()
  })

  it('is a no-op when dsn opt is empty string', () => {
    initSentry({ serviceName: 'test-app', dsn: '' })

    expect(initMock).not.toHaveBeenCalled()
  })

  it('does not throw when called repeatedly without DSN', () => {
    expect(() => {
      initSentry({ serviceName: 'test-app' })
      initSentry({ serviceName: 'test-app' })
      initSentry({ serviceName: 'test-app' })
    }).not.toThrow()
  })
})

describe('initSentry — with DSN', () => {
  const FAKE_DSN = 'https://abc123@o0.ingest.sentry.io/1'

  it('calls Sentry.init with expected config when dsn opt provided', () => {
    initSentry({ serviceName: 'ezauth', dsn: FAKE_DSN })

    expect(initMock).toHaveBeenCalledTimes(1)
    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: FAKE_DSN,
        serverName: 'ezauth',
        environment: 'development',
        tracesSampleRate: 0.1,
        // ZERO auto-integrations — manual capture only (cf. 2026-04-25 incident).
        integrations: [],
      })
    )
  })

  it('reads dsn from SENTRY_DSN env when opt not provided', () => {
    process.env.SENTRY_DSN = FAKE_DSN

    initSentry({ serviceName: 'ezauth' })

    expect(initMock).toHaveBeenCalledTimes(1)
    expect(initMock).toHaveBeenCalledWith(expect.objectContaining({ dsn: FAKE_DSN }))
  })

  it('reads environment from DEPLOY_ENV env', () => {
    process.env.DEPLOY_ENV = 'production'

    initSentry({ serviceName: 'ezauth', dsn: FAKE_DSN })

    expect(initMock).toHaveBeenCalledWith(expect.objectContaining({ environment: 'production' }))
  })

  it('explicit environment opt wins over DEPLOY_ENV env', () => {
    process.env.DEPLOY_ENV = 'production'

    initSentry({ serviceName: 'ezauth', dsn: FAKE_DSN, environment: 'staging' })

    expect(initMock).toHaveBeenCalledWith(expect.objectContaining({ environment: 'staging' }))
  })

  it('reads release from VERCEL_GIT_COMMIT_SHA when set', () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'abc123def'

    initSentry({ serviceName: 'ezauth', dsn: FAKE_DSN })

    expect(initMock).toHaveBeenCalledWith(expect.objectContaining({ release: 'abc123def' }))
  })

  it('reads release from RAILWAY_GIT_COMMIT_SHA when VERCEL not set', () => {
    process.env.RAILWAY_GIT_COMMIT_SHA = 'rly987'

    initSentry({ serviceName: 'ezauth', dsn: FAKE_DSN })

    expect(initMock).toHaveBeenCalledWith(expect.objectContaining({ release: 'rly987' }))
  })

  it('explicit release opt wins over env', () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'abc123'

    initSentry({ serviceName: 'ezauth', dsn: FAKE_DSN, release: 'v1.2.3' })

    expect(initMock).toHaveBeenCalledWith(expect.objectContaining({ release: 'v1.2.3' }))
  })

  it('honors custom tracesSampleRate (0 disables tracing)', () => {
    initSentry({ serviceName: 'ezauth', dsn: FAKE_DSN, tracesSampleRate: 0 })

    expect(initMock).toHaveBeenCalledWith(expect.objectContaining({ tracesSampleRate: 0 }))
  })
})

describe('captureException — defensive', () => {
  it('never throws when Sentry not initialized', () => {
    // Note: real Sentry.captureException is a no-op when init was never
    // called. We validate our wrapper is at least as safe (and additionally
    // catches throws in case the SDK ever changes behaviour).
    expect(() => captureException(new Error('boom'))).not.toThrow()
    expect(() => captureException(new Error('boom'), { userId: 'u1' })).not.toThrow()
    expect(() => captureException('not an error')).not.toThrow()
    expect(() => captureException(undefined)).not.toThrow()
  })

  it('forwards err + context to Sentry.captureException', () => {
    const err = new Error('boom')
    captureException(err, { route: '/api/test', userId: 'u1' })

    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    expect(captureExceptionMock).toHaveBeenCalledWith(err, {
      extra: { route: '/api/test', userId: 'u1' },
    })
  })

  it('omits hint when no context provided', () => {
    const err = new Error('boom')
    captureException(err)

    expect(captureExceptionMock).toHaveBeenCalledWith(err, undefined)
  })

  it('swallows errors thrown by Sentry transport', () => {
    captureExceptionMock.mockImplementationOnce(() => {
      throw new Error('Sentry network down')
    })

    // Caller must never see the transport error — request lifecycle goes on.
    expect(() => captureException(new Error('app error'))).not.toThrow()
  })
})
