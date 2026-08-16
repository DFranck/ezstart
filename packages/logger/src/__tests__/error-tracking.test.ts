/**
 * Tests for the error-tracking provider detection helper.
 *
 * Validates the priority order Sentry > Logtail > none, and that both the
 * `NEXT_PUBLIC_*` (browser) and server-only variants are recognized.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { detectErrorTracker } from '../error-tracking.js'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
  delete process.env.SENTRY_DSN
  delete process.env.NEXT_PUBLIC_SENTRY_DSN
  delete process.env.LOGTAIL_SOURCE_TOKEN
  delete process.env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.unstubAllEnvs()
})

describe('detectErrorTracker — none', () => {
  it('returns null when no env vars are set', () => {
    expect(detectErrorTracker()).toBe(null)
  })

  it('returns null when env vars are empty strings', () => {
    process.env.SENTRY_DSN = ''
    process.env.NEXT_PUBLIC_SENTRY_DSN = ''
    process.env.LOGTAIL_SOURCE_TOKEN = ''
    process.env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN = ''
    expect(detectErrorTracker()).toBe(null)
  })
})

describe('detectErrorTracker — Sentry', () => {
  it('returns "sentry" when NEXT_PUBLIC_SENTRY_DSN is set', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://abc@sentry.io/1'
    expect(detectErrorTracker()).toBe('sentry')
  })

  it('returns "sentry" when SENTRY_DSN is set', () => {
    process.env.SENTRY_DSN = 'https://abc@sentry.io/1'
    expect(detectErrorTracker()).toBe('sentry')
  })

  it('returns "sentry" when both NEXT_PUBLIC_SENTRY_DSN and SENTRY_DSN are set', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://abc@sentry.io/1'
    process.env.SENTRY_DSN = 'https://abc@sentry.io/1'
    expect(detectErrorTracker()).toBe('sentry')
  })
})

describe('detectErrorTracker — Logtail', () => {
  it('returns "logtail" when NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN is set', () => {
    process.env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN = 'abc123'
    expect(detectErrorTracker()).toBe('logtail')
  })

  it('returns "logtail" when LOGTAIL_SOURCE_TOKEN is set', () => {
    process.env.LOGTAIL_SOURCE_TOKEN = 'abc123'
    expect(detectErrorTracker()).toBe('logtail')
  })
})

describe('detectErrorTracker — priority', () => {
  it('returns "sentry" when both Sentry and Logtail are set (Sentry wins)', () => {
    process.env.SENTRY_DSN = 'https://abc@sentry.io/1'
    process.env.LOGTAIL_SOURCE_TOKEN = 'abc123'
    expect(detectErrorTracker()).toBe('sentry')
  })

  it('returns "sentry" when both NEXT_PUBLIC variants are set (Sentry wins)', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://abc@sentry.io/1'
    process.env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN = 'abc123'
    expect(detectErrorTracker()).toBe('sentry')
  })
})
