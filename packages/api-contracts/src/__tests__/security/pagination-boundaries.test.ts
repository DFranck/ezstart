/**
 * Adversarial boundary tests for pagination schemas.
 *
 * Goal: prove the schema rejects every permissive `z.coerce.number()` quirk
 * documented in `tmp/audit-api-contracts-hacker.md` §H5. After Wave A Lot 1
 * (2026-05-15) the schema uses a strict regex-validated parser — every
 * non-canonical input must be rejected.
 */

import { describe, expect, it } from 'vitest'
import { PaginationQuerySchema } from '../../pagination.js'

describe('PaginationQuerySchema — coerce edge cases (post-hardening)', () => {
  it('rejects empty string', () => {
    expect(() => PaginationQuerySchema.parse({ limit: '' })).toThrow()
  })

  it('rejects boolean true (was: coerced to 1, now rejected)', () => {
    expect(() => PaginationQuerySchema.parse({ limit: true })).toThrow()
  })

  it('rejects boolean false', () => {
    expect(() => PaginationQuerySchema.parse({ limit: false })).toThrow()
  })

  it('rejects null', () => {
    expect(() => PaginationQuerySchema.parse({ limit: null })).toThrow()
  })

  it('rejects Infinity', () => {
    expect(() => PaginationQuerySchema.parse({ limit: Infinity })).toThrow()
  })

  it('rejects -Infinity', () => {
    expect(() => PaginationQuerySchema.parse({ limit: -Infinity })).toThrow()
  })

  it('rejects NaN', () => {
    expect(() => PaginationQuerySchema.parse({ limit: NaN })).toThrow()
  })

  it('rejects very large offset above 10_000 (Mongo skip DoS guard)', () => {
    expect(() => PaginationQuerySchema.parse({ offset: 10_001 })).toThrow()
    expect(() => PaginationQuerySchema.parse({ offset: 1_000_000 })).toThrow()
    expect(() => PaginationQuerySchema.parse({ offset: 1_000_001 })).toThrow()
  })

  it('accepts offset at new max boundary (10_000)', () => {
    const result = PaginationQuerySchema.parse({ offset: 10_000 })
    expect(result.offset).toBe(10_000)
  })

  it('accepts offset 0 (lower boundary)', () => {
    const result = PaginationQuerySchema.parse({ offset: 0 })
    expect(result.offset).toBe(0)
  })
})
