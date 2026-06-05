/**
 * Tests for `assertCriticalDeps` + `findMissingDeps` — hacker-A8 V3 fix.
 *
 * The boot-time gate must:
 *  - THROW in production when any required env var is missing
 *    (fail-fast — never let a silent-skip /health/deep check produce a
 *    false-positive "All systems operational" on the status page).
 *  - WARN in non-production so a dev API still boots without Resend etc.
 *  - Be a no-op when every required env var is present.
 */

import { describe, expect, it, vi } from 'vitest'

import {
  assertCriticalDeps,
  findMissingDeps,
  type CriticalDepsLogger,
} from '../../core/critical-deps.js'

function makeLogger(): CriticalDepsLogger & {
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
} {
  return {
    warn: vi.fn(),
    error: vi.fn(),
  }
}

describe('findMissingDeps', () => {
  it('returns an empty array when every key is present and non-empty', () => {
    const missing = findMissingDeps(['A', 'B'], { A: '1', B: '2' })
    expect(missing).toEqual([])
  })

  it('returns the keys missing from the env', () => {
    const missing = findMissingDeps(['A', 'B', 'C'], { A: '1' })
    expect(missing).toEqual(['B', 'C'])
  })

  it('treats an empty string as missing (Railway/Vercel unset semantics)', () => {
    const missing = findMissingDeps(['A', 'B'], { A: '1', B: '' })
    expect(missing).toEqual(['B'])
  })

  it('handles an empty `required` array gracefully', () => {
    expect(findMissingDeps([], { A: '1' })).toEqual([])
  })
})

describe('assertCriticalDeps', () => {
  it('is a no-op when every required key is present', () => {
    const logger = makeLogger()
    expect(() =>
      assertCriticalDeps({
        app: 'ezauth',
        required: ['A', 'B'],
        logger,
        env: { A: '1', B: '2' },
        isProd: true,
      })
    ).not.toThrow()
    expect(logger.warn).not.toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('THROWS in production when a required key is missing (V3 fail-fast)', () => {
    const logger = makeLogger()
    expect(() =>
      assertCriticalDeps({
        app: 'ezauth',
        required: ['MONGO_URL', 'JWT_SECRET', 'RESEND_API_KEY'],
        logger,
        env: { MONGO_URL: '...', JWT_SECRET: '...' },
        isProd: true,
      })
    ).toThrow(/RESEND_API_KEY/)
    expect(logger.error).toHaveBeenCalledOnce()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('lists every missing key in the production error (V3)', () => {
    const logger = makeLogger()
    expect(() =>
      assertCriticalDeps({
        app: 'ezpay',
        required: ['MONGO_URL', 'STRIPE_SECRET_KEY', 'RESEND_API_KEY'],
        logger,
        env: { MONGO_URL: 'x' },
        isProd: true,
      })
    ).toThrow(/STRIPE_SECRET_KEY.*RESEND_API_KEY|RESEND_API_KEY.*STRIPE_SECRET_KEY/)
  })

  it('WARNS in non-production instead of throwing (V3 graceful dev)', () => {
    const logger = makeLogger()
    expect(() =>
      assertCriticalDeps({
        app: 'ezauth',
        required: ['MONGO_URL', 'RESEND_API_KEY'],
        logger,
        env: { MONGO_URL: '...' },
        isProd: false,
      })
    ).not.toThrow()
    expect(logger.warn).toHaveBeenCalledOnce()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('emits a warning that mentions the missing var(s) and false-positive risk', () => {
    const logger = makeLogger()
    assertCriticalDeps({
      app: 'ezauth',
      required: ['RESEND_API_KEY'],
      logger,
      env: {},
      isProd: false,
    })
    const [message] = logger.warn.mock.calls[0] as [string, unknown]
    expect(message).toContain('RESEND_API_KEY')
    expect(message).toContain('false-positive')
  })

  it('defaults isProd to NODE_ENV === production when omitted', () => {
    const logger = makeLogger()
    expect(() =>
      assertCriticalDeps({
        app: 'ezauth',
        required: ['MISSING_VAR'],
        logger,
        env: { NODE_ENV: 'production' },
      })
    ).toThrow(/MISSING_VAR/)
  })

  it('non-prod default does NOT throw (NODE_ENV unset or dev)', () => {
    const logger = makeLogger()
    expect(() =>
      assertCriticalDeps({
        app: 'ezauth',
        required: ['MISSING_VAR'],
        logger,
        env: { NODE_ENV: 'development' },
      })
    ).not.toThrow()
    expect(logger.warn).toHaveBeenCalledOnce()
  })

  it('includes the app slug in error / warn output for operator triage', () => {
    const logger = makeLogger()
    assertCriticalDeps({
      app: 'gacha-analyzer',
      required: ['NEEDED'],
      logger,
      env: {},
      isProd: false,
    })
    const [message] = logger.warn.mock.calls[0] as [string, unknown]
    expect(message).toContain('gacha-analyzer')
  })
})
