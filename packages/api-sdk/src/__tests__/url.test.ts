import { describe, expect, it } from 'vitest'
import { appendQuery } from '../core/internal/url.js'

describe('appendQuery', () => {
  it('appends a query to a URL with no existing query and no fragment', () => {
    expect(appendQuery('https://x.com/users', { page: 2 })).toBe('https://x.com/users?page=2')
  })

  it('appends a query to a URL that already has an existing query string', () => {
    expect(appendQuery('https://x.com/users?sort=name', { page: 2 })).toBe(
      'https://x.com/users?sort=name&page=2'
    )
  })

  it('preserves a trailing #fragment when appending a query (CRIT-4)', () => {
    expect(appendQuery('https://x.com/users#section', { page: 2 })).toBe(
      'https://x.com/users?page=2#section'
    )
  })

  it('preserves the fragment when the URL already has both a query and a fragment (CRIT-4)', () => {
    expect(appendQuery('https://x.com/users?sort=name#top', { page: 2 })).toBe(
      'https://x.com/users?sort=name&page=2#top'
    )
  })

  it('returns the URL untouched when query is undefined', () => {
    expect(appendQuery('https://x.com/users', undefined)).toBe('https://x.com/users')
  })

  it('returns the URL untouched when query is an empty object', () => {
    expect(appendQuery('https://x.com/users', {})).toBe('https://x.com/users')
  })

  it('skips null and undefined values and only serializes defined entries', () => {
    expect(appendQuery('https://x.com/users', { a: null, b: undefined, c: 'ok' })).toBe(
      'https://x.com/users?c=ok'
    )
  })

  it('returns the URL untouched (fragment included) when the query is empty even with a fragment', () => {
    expect(appendQuery('https://x.com/users#empty', {})).toBe('https://x.com/users#empty')
  })

  it('preserves a fragment that itself contains `?` and `&` chars verbatim', () => {
    expect(appendQuery('https://x.com/path#with?weird&chars', { x: 1 })).toBe(
      'https://x.com/path?x=1#with?weird&chars'
    )
  })
})
