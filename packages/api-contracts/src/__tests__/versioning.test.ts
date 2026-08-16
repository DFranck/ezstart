import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  API_VERSION_FORMAT,
  API_VERSION_HEADER,
  ApiVersionSchema,
  CURRENT_API_VERSION,
  SUPPORTED_API_VERSIONS,
  type ApiVersion,
} from '../versioning.js'

describe('API_VERSION_HEADER', () => {
  it('uses the EZStart vendor prefix to avoid header collisions', () => {
    expect(API_VERSION_HEADER).toBe('EZStart-API-Version')
  })

  it('is typed as a literal (not widened to string)', () => {
    expectTypeOf<typeof API_VERSION_HEADER>().toEqualTypeOf<'EZStart-API-Version'>()
  })
})

describe('API_VERSION_FORMAT', () => {
  it('matches the YYYY-MM-DD shape', () => {
    expect(API_VERSION_FORMAT.test('2026-05-15')).toBe(true)
    expect(API_VERSION_FORMAT.test('1999-12-31')).toBe(true)
    expect(API_VERSION_FORMAT.test('2100-01-01')).toBe(true)
  })

  it('rejects malformed dates', () => {
    expect(API_VERSION_FORMAT.test('2026/05/15')).toBe(false)
    expect(API_VERSION_FORMAT.test('26-05-15')).toBe(false) // 2-digit year
    expect(API_VERSION_FORMAT.test('2026-5-15')).toBe(false) // unpadded month
    expect(API_VERSION_FORMAT.test('v1')).toBe(false)
    expect(API_VERSION_FORMAT.test('')).toBe(false)
  })
})

describe('ApiVersionSchema', () => {
  it('accepts the current API version', () => {
    expect(ApiVersionSchema.parse(CURRENT_API_VERSION)).toBe(CURRENT_API_VERSION)
  })

  it('accepts arbitrary well-formed dates (format-only check)', () => {
    expect(ApiVersionSchema.parse('2026-05-15')).toBe('2026-05-15')
    expect(ApiVersionSchema.parse('2030-01-01')).toBe('2030-01-01')
    // Format-only — calendar validity is NOT enforced here on purpose
    // (downstream router validates membership in SUPPORTED_API_VERSIONS)
    expect(ApiVersionSchema.parse('2026-02-31')).toBe('2026-02-31')
  })

  it('rejects malformed strings', () => {
    expect(() => ApiVersionSchema.parse('v1')).toThrow()
    expect(() => ApiVersionSchema.parse('2026/05/15')).toThrow()
    expect(() => ApiVersionSchema.parse('2026-5-15')).toThrow()
    expect(() => ApiVersionSchema.parse('')).toThrow()
    expect(() => ApiVersionSchema.parse('latest')).toThrow()
  })

  it('rejects non-string inputs', () => {
    expect(() => ApiVersionSchema.parse(20260515)).toThrow()
    expect(() => ApiVersionSchema.parse(new Date('2026-05-15'))).toThrow()
    expect(() => ApiVersionSchema.parse(null)).toThrow()
    expect(() => ApiVersionSchema.parse(undefined)).toThrow()
  })

  it('exports the inferred type as string', () => {
    expectTypeOf<ApiVersion>().toEqualTypeOf<string>()
  })
})

describe('CURRENT_API_VERSION', () => {
  it('is a well-formed YYYY-MM-DD string', () => {
    expect(API_VERSION_FORMAT.test(CURRENT_API_VERSION)).toBe(true)
    expect(ApiVersionSchema.parse(CURRENT_API_VERSION)).toBe(CURRENT_API_VERSION)
  })

  it('appears in SUPPORTED_API_VERSIONS', () => {
    expect(SUPPORTED_API_VERSIONS).toContain(CURRENT_API_VERSION)
  })
})

describe('SUPPORTED_API_VERSIONS', () => {
  it('contains at least the current version', () => {
    expect(SUPPORTED_API_VERSIONS.length).toBeGreaterThan(0)
    expect(SUPPORTED_API_VERSIONS).toContain(CURRENT_API_VERSION)
  })

  it('contains only well-formed YYYY-MM-DD strings', () => {
    for (const v of SUPPORTED_API_VERSIONS) {
      expect(API_VERSION_FORMAT.test(v)).toBe(true)
    }
  })

  it('is frozen (cannot be mutated at runtime)', () => {
    expect(Object.isFrozen(SUPPORTED_API_VERSIONS)).toBe(true)
  })

  it('lists the current version first (newest-first convention)', () => {
    expect(SUPPORTED_API_VERSIONS[0]).toBe(CURRENT_API_VERSION)
  })
})
