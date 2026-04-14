import { describe, expect, it } from 'vitest'
import { PaginationQuerySchema, type PaginationQuery } from '../pagination.js'

describe('PaginationQuerySchema', () => {
  it('applies defaults when query is empty', () => {
    const parsed: PaginationQuery = PaginationQuerySchema.parse({})
    expect(parsed).toEqual({ limit: 20, offset: 0 })
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
    expect(PaginationQuerySchema.parse({ offset: 0 })).toEqual({ limit: 20, offset: 0 })
  })

  it('ignores unknown keys (Zod default behavior)', () => {
    const parsed = PaginationQuerySchema.parse({ limit: 5, cursor: 'abc', whatever: true })
    expect(parsed).toEqual({ limit: 5, offset: 0 })
  })
})
