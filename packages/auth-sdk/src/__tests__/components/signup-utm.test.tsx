/**
 * Unit tests for the shared `readUtmSource` helper used by SignUpForm and
 * QuickSignUpForm to forward localStorage-persisted `utm_source` attribution
 * to the backend alongside the rest of the signup payload.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  readUtmSource,
  UTM_SOURCE_MAX_LENGTH,
  UTM_SOURCE_STORAGE_KEY,
} from '../../components/utmSource.js'

describe('readUtmSource', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns the trimmed utm_source when set', () => {
    window.localStorage.setItem(UTM_SOURCE_STORAGE_KEY, 'product-hunt')
    expect(readUtmSource()).toBe('product-hunt')
  })

  it('trims surrounding whitespace', () => {
    window.localStorage.setItem(UTM_SOURCE_STORAGE_KEY, '  twitter  ')
    expect(readUtmSource()).toBe('twitter')
  })

  it('returns undefined when the value is missing', () => {
    expect(readUtmSource()).toBeUndefined()
  })

  it('returns undefined for an empty string', () => {
    window.localStorage.setItem(UTM_SOURCE_STORAGE_KEY, '')
    expect(readUtmSource()).toBeUndefined()
  })

  it('returns undefined for whitespace-only values', () => {
    window.localStorage.setItem(UTM_SOURCE_STORAGE_KEY, '   ')
    expect(readUtmSource()).toBeUndefined()
  })

  it('caps the value at UTM_SOURCE_MAX_LENGTH (128) chars', () => {
    const long = 'a'.repeat(500)
    window.localStorage.setItem(UTM_SOURCE_STORAGE_KEY, long)
    const result = readUtmSource()
    expect(result).toBeDefined()
    expect(result?.length).toBe(UTM_SOURCE_MAX_LENGTH)
  })

  it('accepts values exactly at the max length unchanged', () => {
    const exact = 'b'.repeat(UTM_SOURCE_MAX_LENGTH)
    window.localStorage.setItem(UTM_SOURCE_STORAGE_KEY, exact)
    expect(readUtmSource()).toBe(exact)
  })

  it('returns undefined when localStorage access throws', () => {
    const original = window.localStorage.getItem
    // Simulate storage disabled / quota / private browsing
    Object.defineProperty(window.localStorage, 'getItem', {
      value: () => {
        throw new Error('storage disabled')
      },
      configurable: true,
      writable: true,
    })

    try {
      expect(readUtmSource()).toBeUndefined()
    } finally {
      Object.defineProperty(window.localStorage, 'getItem', {
        value: original,
        configurable: true,
        writable: true,
      })
    }
  })
})
