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
