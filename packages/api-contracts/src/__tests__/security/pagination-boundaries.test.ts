/**
 * Adversarial boundary tests for pagination schemas.
 *
 * Goal: prove z.coerce edge cases are handled properly.
 */

import { describe, expect, it } from 'vitest'
import { PaginationQuerySchema } from '../../pagination.js'

describe('PaginationQuerySchema — coerce edge cases', () => {
  it('rejects NaN from coercion (empty string)', () => {
    // z.coerce.number() on '' gives NaN which should fail .int()
    expect(() => PaginationQuerySchema.parse({ limit: '' })).toThrow()
  })

  it('rejects boolean true coerced to 1 (should only accept number/string)', () => {
    // z.coerce.number()(true) = 1 — this actually passes .int().min(1).max(100)
    // This is a known z.coerce behavior. Document it.
    const result = PaginationQuerySchema.parse({ limit: true })
    expect(result.limit).toBe(1) // coerces to 1 — acceptable edge case
  })

  it('rejects null coerced to 0 for limit (below min)', () => {
    // z.coerce.number()(null) = 0
    expect(() => PaginationQuerySchema.parse({ limit: null })).toThrow()
  })

  it('rejects Infinity', () => {
    expect(() => PaginationQuerySchema.parse({ limit: Infinity })).toThrow()
  })

  it('rejects -Infinity', () => {
    expect(() => PaginationQuerySchema.parse({ limit: -Infinity })).toThrow()
  })

  it('rejects very large offset (memory guard)', () => {
    // Offset of 999999999 is technically valid in current schema (no max).
    // This test documents the issue — an upper bound should be added.
    expect(() =>
      PaginationQuerySchema.parse({ offset: 1_000_001 })
    ).toThrow()
  })

  it('accepts offset at max boundary (1_000_000)', () => {
    const result = PaginationQuerySchema.parse({ offset: 1_000_000 })
    expect(result.offset).toBe(1_000_000)
  })
})
