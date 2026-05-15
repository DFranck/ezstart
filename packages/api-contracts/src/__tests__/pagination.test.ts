import { describe, expect, it } from 'vitest'
import {
  CursorPaginationMetaSchema,
  CursorPaginationQuerySchema,
  PaginationQuerySchema,
  type CursorPaginationMeta,
  type CursorPaginationQuery,
  type PaginationQuery,
} from '../pagination.js'

describe('PaginationQuerySchema', () => {
  it('applies defaults when query is empty (limit=50 per standard-saas-data.md §3)', () => {
    const parsed: PaginationQuery = PaginationQuerySchema.parse({})
    expect(parsed).toEqual({ limit: 50, offset: 0 })
  })

  it('coerces numeric strings (typical req.query shape)', () => {
    const parsed = PaginationQuerySchema.parse({ limit: '50', offset: '100' })
    expect(parsed).toEqual({ limit: 50, offset: 100 })
    expect(typeof parsed.limit).toBe('number')
    expect(typeof parsed.offset).toBe('number')
  })

  it('accepts numbers directly', () => {
    const parsed = PaginationQuerySchema.parse({ limit: 10, offset: 0 })
    expect(parsed).toEqual({ limit: 10, offset: 0 })
  })

  it('rejects non-numeric limit strings', () => {
    expect(() => PaginationQuerySchema.parse({ limit: 'abc' })).toThrow()
  })

  it('rejects limit below 1', () => {
    expect(() => PaginationQuerySchema.parse({ limit: 0 })).toThrow()
    expect(() => PaginationQuerySchema.parse({ limit: -5 })).toThrow()
  })

  it('rejects limit above 100 (DDoS guard)', () => {
    expect(() => PaginationQuerySchema.parse({ limit: 101 })).toThrow()
    expect(() => PaginationQuerySchema.parse({ limit: 1000 })).toThrow()
  })

  it('rejects negative offset', () => {
    expect(() => PaginationQuerySchema.parse({ offset: -1 })).toThrow()
  })

  it('rejects non-integer values (floats)', () => {
    expect(() => PaginationQuerySchema.parse({ limit: 1.5 })).toThrow()
    expect(() => PaginationQuerySchema.parse({ offset: 0.1 })).toThrow()
  })

  it('allows upper boundary (limit=100) and lower boundary (limit=1, offset=0)', () => {
    expect(PaginationQuerySchema.parse({ limit: 100 })).toEqual({ limit: 100, offset: 0 })
    expect(PaginationQuerySchema.parse({ limit: 1 })).toEqual({ limit: 1, offset: 0 })
    expect(PaginationQuerySchema.parse({ offset: 0 })).toEqual({ limit: 50, offset: 0 })
  })

  it('ignores unknown keys (Zod default behavior)', () => {
    const parsed = PaginationQuerySchema.parse({ limit: 5, cursor: 'abc', whatever: true })
    expect(parsed).toEqual({ limit: 5, offset: 0 })
  })
})

// ---------------------------------------------------------------------------
// H5 — Hacker bypass closure (hex / scientific / boolean / array / object)
//
// Source: tmp/audit-api-contracts-hacker.md §H5
//
// `z.coerce.number()` accepts a wider input set than intuitive. The hardened
// schema uses a strict `/^\d+$/` regex on string inputs and disallows
// booleans/arrays/objects entirely. Each assertion below mirrors a verified
// reproducer from the audit.
// ---------------------------------------------------------------------------

describe('PaginationQuerySchema — H5 strict coerce (hacker bypass closure)', () => {
  it('rejects hex string 0x10 (was: coerced to 16)', () => {
    expect(PaginationQuerySchema.safeParse({ limit: '0x10' }).success).toBe(false)
  })

  it('rejects hex string 0xff (was: coerced to 255, bypassing max 100)', () => {
    expect(PaginationQuerySchema.safeParse({ limit: '0xff' }).success).toBe(false)
  })

  it('rejects scientific notation 1e2 (was: coerced to 100)', () => {
    expect(PaginationQuerySchema.safeParse({ limit: '1e2' }).success).toBe(false)
  })

  it('rejects scientific notation 1.5e2 (was: coerced to 150, bypassing max 100)', () => {
    expect(PaginationQuerySchema.safeParse({ limit: '1.5e2' }).success).toBe(false)
  })

  it('rejects single-element array [50] (was: coerced to 50)', () => {
    expect(PaginationQuerySchema.safeParse({ limit: [50] }).success).toBe(false)
  })

  it('rejects empty array [] (was: coerced to 0 for offset)', () => {
    expect(PaginationQuerySchema.safeParse({ offset: [] }).success).toBe(false)
  })

  it('rejects boolean true (was: coerced to 1)', () => {
    expect(PaginationQuerySchema.safeParse({ limit: true }).success).toBe(false)
  })

  it('rejects boolean false (was: coerced to 0)', () => {
    expect(PaginationQuerySchema.safeParse({ limit: false }).success).toBe(false)
  })

  it('rejects null (was: coerced to 0)', () => {
    expect(PaginationQuerySchema.safeParse({ limit: null }).success).toBe(false)
  })

  it('rejects object with valueOf (was: coerced to 50)', () => {
    expect(PaginationQuerySchema.safeParse({ limit: { valueOf: () => 50 } }).success).toBe(false)
  })

  it('rejects whitespace-padded string " 50 " (was: trimmed and coerced)', () => {
    expect(PaginationQuerySchema.safeParse({ limit: ' 50 ' }).success).toBe(false)
  })

  it('rejects empty string ""', () => {
    expect(PaginationQuerySchema.safeParse({ limit: '' }).success).toBe(false)
  })

  it('rejects negative -10', () => {
    expect(PaginationQuerySchema.safeParse({ limit: -10 }).success).toBe(false)
  })

  it('rejects 0 (below min for limit)', () => {
    expect(PaginationQuerySchema.safeParse({ limit: 0 }).success).toBe(false)
  })

  it('rejects 101 (above max)', () => {
    expect(PaginationQuerySchema.safeParse({ limit: 101 }).success).toBe(false)
  })

  it('rejects Infinity', () => {
    expect(PaginationQuerySchema.safeParse({ limit: Infinity }).success).toBe(false)
  })

  it('rejects NaN', () => {
    expect(PaginationQuerySchema.safeParse({ limit: NaN }).success).toBe(false)
  })

  it('accepts canonical string "50"', () => {
    const result = PaginationQuerySchema.safeParse({ limit: '50' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.limit).toBe(50)
  })

  it('accepts canonical number 50', () => {
    const result = PaginationQuerySchema.safeParse({ limit: 50 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.limit).toBe(50)
  })

  it('default limit is 50 (per standard-saas-data.md §3)', () => {
    expect(PaginationQuerySchema.parse({}).limit).toBe(50)
  })
})

describe('PaginationQuerySchema — offset bounds (DoS reduction)', () => {
  it('rejects offset 10_001 (was: max 1_000_000 → Mongo skip DoS)', () => {
    expect(PaginationQuerySchema.safeParse({ offset: 10_001 }).success).toBe(false)
  })

  it('rejects offset 1_000_000 (was: accepted, now hard-capped)', () => {
    expect(PaginationQuerySchema.safeParse({ offset: 1_000_000 }).success).toBe(false)
  })

  it('accepts offset 10_000 (upper boundary)', () => {
    const result = PaginationQuerySchema.safeParse({ offset: 10_000 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.offset).toBe(10_000)
  })

  it('accepts offset string "10000" (upper boundary as query param)', () => {
    const result = PaginationQuerySchema.safeParse({ offset: '10000' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.offset).toBe(10_000)
  })

  it('rejects offset hex string "0x100" (consistent with limit)', () => {
    expect(PaginationQuerySchema.safeParse({ offset: '0x100' }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Cursor pagination
// ---------------------------------------------------------------------------

describe('CursorPaginationQuerySchema', () => {
  it('applies default limit when query is empty', () => {
    const parsed: CursorPaginationQuery = CursorPaginationQuerySchema.parse({})
    expect(parsed).toEqual({ limit: 50 })
    expect(parsed.cursor).toBeUndefined()
  })

  it('accepts a cursor + limit pair', () => {
    const parsed = CursorPaginationQuerySchema.parse({ cursor: 'eyJpZCI6ImFiYyJ9', limit: 10 })
    expect(parsed).toEqual({ cursor: 'eyJpZCI6ImFiYyJ9', limit: 10 })
  })

  it('accepts a numeric limit string (typical req.query shape)', () => {
    const parsed = CursorPaginationQuerySchema.parse({ limit: '25' })
    expect(parsed.limit).toBe(25)
    expect(typeof parsed.limit).toBe('number')
  })

  it('rejects empty cursor string (cursor must be non-empty when present)', () => {
    expect(CursorPaginationQuerySchema.safeParse({ cursor: '' }).success).toBe(false)
  })

  it('rejects cursor longer than 2048 characters', () => {
    const tooLong = 'a'.repeat(2049)
    expect(CursorPaginationQuerySchema.safeParse({ cursor: tooLong }).success).toBe(false)
  })

  it('accepts cursor at the 2048-char boundary', () => {
    const boundary = 'a'.repeat(2048)
    const result = CursorPaginationQuerySchema.safeParse({ cursor: boundary })
    expect(result.success).toBe(true)
  })

  it('rejects non-string cursor', () => {
    expect(CursorPaginationQuerySchema.safeParse({ cursor: 123 }).success).toBe(false)
    expect(CursorPaginationQuerySchema.safeParse({ cursor: ['a', 'b'] }).success).toBe(false)
    expect(CursorPaginationQuerySchema.safeParse({ cursor: { id: 'a' } }).success).toBe(false)
  })

  it('applies the same strict positive-int rules to limit as offset variant', () => {
    expect(CursorPaginationQuerySchema.safeParse({ limit: 0 }).success).toBe(false)
    expect(CursorPaginationQuerySchema.safeParse({ limit: 101 }).success).toBe(false)
    expect(CursorPaginationQuerySchema.safeParse({ limit: 1.5 }).success).toBe(false)
    expect(CursorPaginationQuerySchema.safeParse({ limit: '0x10' }).success).toBe(false)
    expect(CursorPaginationQuerySchema.safeParse({ limit: '1e2' }).success).toBe(false)
    expect(CursorPaginationQuerySchema.safeParse({ limit: [50] }).success).toBe(false)
    expect(CursorPaginationQuerySchema.safeParse({ limit: true }).success).toBe(false)
  })
})

describe('CursorPaginationMetaSchema', () => {
  it('accepts a typical "more results" meta', () => {
    const parsed: CursorPaginationMeta = CursorPaginationMetaSchema.parse({
      nextCursor: 'eyJpZCI6ImFiYyJ9',
      hasMore: true,
    })
    expect(parsed).toEqual({ nextCursor: 'eyJpZCI6ImFiYyJ9', hasMore: true })
  })

  it('accepts the terminal "no more results" meta (nextCursor null)', () => {
    const parsed = CursorPaginationMetaSchema.parse({ nextCursor: null, hasMore: false })
    expect(parsed).toEqual({ nextCursor: null, hasMore: false })
  })

  it('rejects missing hasMore', () => {
    expect(CursorPaginationMetaSchema.safeParse({ nextCursor: 'abc' }).success).toBe(false)
  })

  it('rejects missing nextCursor (must be either string or null, not omitted)', () => {
    expect(CursorPaginationMetaSchema.safeParse({ hasMore: false }).success).toBe(false)
  })

  it('rejects non-boolean hasMore', () => {
    expect(
      CursorPaginationMetaSchema.safeParse({ nextCursor: null, hasMore: 'true' }).success
    ).toBe(false)
    expect(CursorPaginationMetaSchema.safeParse({ nextCursor: null, hasMore: 1 }).success).toBe(
      false
    )
  })

  it('rejects empty cursor string', () => {
    expect(CursorPaginationMetaSchema.safeParse({ nextCursor: '', hasMore: false }).success).toBe(
      false
    )
  })

  it('rejects nextCursor longer than 2048 characters', () => {
    const tooLong = 'a'.repeat(2049)
    expect(
      CursorPaginationMetaSchema.safeParse({ nextCursor: tooLong, hasMore: true }).success
    ).toBe(false)
  })
})
