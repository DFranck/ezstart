import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  IDEMPOTENCY_CACHE_TTL_SECONDS,
  IDEMPOTENCY_KEY_HEADER,
  IdempotencyKeySchema,
  type IdempotencyKey,
} from '../idempotency.js'

describe('IDEMPOTENCY_KEY_HEADER', () => {
  it('matches the IETF draft header name exactly', () => {
    expect(IDEMPOTENCY_KEY_HEADER).toBe('Idempotency-Key')
  })

  it('is typed as a literal (not widened to string)', () => {
    expectTypeOf<typeof IDEMPOTENCY_KEY_HEADER>().toEqualTypeOf<'Idempotency-Key'>()
  })
})

describe('IDEMPOTENCY_CACHE_TTL_SECONDS', () => {
  it('is 24 hours in seconds (Stripe-compatible)', () => {
    expect(IDEMPOTENCY_CACHE_TTL_SECONDS).toBe(86_400)
  })

  it('is typed as a literal (not widened to number)', () => {
    expectTypeOf<typeof IDEMPOTENCY_CACHE_TTL_SECONDS>().toEqualTypeOf<86_400>()
  })
})

describe('IdempotencyKeySchema', () => {
  it('accepts a valid UUID v4', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(IdempotencyKeySchema.parse(uuid)).toBe(uuid)
  })

  it('accepts random UUIDs', () => {
    // Generate a few synthetic UUIDs and verify they all pass
    const samples = [
      '00000000-0000-4000-8000-000000000000',
      'ffffffff-ffff-4fff-bfff-ffffffffffff',
      '12345678-1234-4234-9234-123456789012',
    ]
    for (const u of samples) {
      expect(IdempotencyKeySchema.parse(u)).toBe(u)
    }
  })

  it('accepts any UUID variant (RFC 4122) — JSDoc parity (Lot 2.1.1 B.1 fix)', () => {
    // The JSDoc explicitly documents "any UUID variant" — verify v1/v3/v5/v6/v7/v8
    // all parse so the documentation does not drift from runtime behavior.
    const variants = [
      // v1 (timestamp-based)
      '550e8400-e29b-11d4-a716-446655440000',
      // v3 (MD5 namespace)
      '6fa459ea-ee8a-3ca4-894e-db77e160355e',
      // v4 (random — historic default)
      '550e8400-e29b-41d4-a716-446655440000',
      // v5 (SHA-1 namespace)
      '886313e1-3b8a-5372-9b90-0c9aee199e5d',
      // v6 (reordered timestamp)
      '1ec9414c-232a-6b00-b3c8-9f6bdeced846',
      // v7 (Unix-ms timestamp + random — increasingly used by modern libs)
      '018f7c5e-1234-7000-8000-000000000000',
      // v8 (custom)
      '550e8400-e29b-81d4-a716-446655440000',
      // nil UUID (special case — P3 posture note per hacker report)
      '00000000-0000-0000-0000-000000000000',
    ]
    for (const u of variants) {
      expect(IdempotencyKeySchema.parse(u)).toBe(u)
    }
  })

  it('rejects non-UUID strings', () => {
    expect(() => IdempotencyKeySchema.parse('1')).toThrow()
    expect(() => IdempotencyKeySchema.parse('test')).toThrow()
    expect(() => IdempotencyKeySchema.parse('not-a-uuid')).toThrow()
    expect(() => IdempotencyKeySchema.parse('')).toThrow()
  })

  it('rejects UUID-shaped but malformed strings', () => {
    // Bad block lengths
    expect(() => IdempotencyKeySchema.parse('550e8400-e29b-41d4-a716')).toThrow()
    // Bad characters (g is not hex)
    expect(() => IdempotencyKeySchema.parse('g50e8400-e29b-41d4-a716-446655440000')).toThrow()
    // Extra characters
    expect(() => IdempotencyKeySchema.parse('550e8400-e29b-41d4-a716-446655440000x')).toThrow()
  })

  it('rejects non-string inputs', () => {
    expect(() => IdempotencyKeySchema.parse(123)).toThrow()
    expect(() => IdempotencyKeySchema.parse(null)).toThrow()
    expect(() => IdempotencyKeySchema.parse(undefined)).toThrow()
    expect(() => IdempotencyKeySchema.parse({ key: 'abc' })).toThrow()
    expect(() => IdempotencyKeySchema.parse([])).toThrow()
  })

  it('accepts a real crypto.randomUUID output', () => {
    // crypto.randomUUID exists in Node 19+ / browsers — guard for older runtimes
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      const generated = globalThis.crypto.randomUUID()
      expect(IdempotencyKeySchema.parse(generated)).toBe(generated)
    }
  })

  it('exports the inferred type as string', () => {
    expectTypeOf<IdempotencyKey>().toEqualTypeOf<string>()
  })
})
