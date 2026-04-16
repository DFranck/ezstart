import { describe, expect, expectTypeOf, it } from 'vitest'
import { apiQuery } from '../ezstart-client.js'
import type {
  PaginatedResponse,
  UseApiInfiniteQueryOptions,
  UseApiMutationOptions,
  UseApiQueryOptions,
} from '../react/react-query.js'

/**
 * Hook behavior (`useQuery` / `useMutation` / `useInfiniteQuery`) relies on
 * `@tanstack/react-query`'s stability (peer-dep) and is covered by
 * integration tests in consumer apps. This file exercises the pure helpers
 * (`queryKey`) and validates the public type surface.
 */
describe('apiQuery', () => {
  const api = apiQuery('ezstart')

  describe('queryKey', () => {
    it('returns [appName, endpoint] when no query params are provided', () => {
      expect(api.queryKey('/users')).toEqual(['ezstart', '/users'])
    })

    it('returns [appName, endpoint, query] when query params are provided', () => {
      expect(api.queryKey('/users', { page: 1 })).toEqual(['ezstart', '/users', { page: 1 }])
    })

    it('omits the query object when it is empty', () => {
      expect(api.queryKey('/users', {})).toEqual(['ezstart', '/users'])
    })

    it('preserves nested query values as-is', () => {
      expect(api.queryKey('/search', { q: 'foo', limit: 20, active: true })).toEqual([
        'ezstart',
        '/search',
        { q: 'foo', limit: 20, active: true },
      ])
    })
  })

  describe('exposed hooks', () => {
    it('returns an object with useQuery, useMutation and useInfiniteQuery', () => {
      expect(typeof api.useQuery).toBe('function')
      expect(typeof api.useMutation).toBe('function')
      expect(typeof api.useInfiniteQuery).toBe('function')
    })
  })

  describe('type surface', () => {
    it('exposes UseApiQueryOptions with optional query / headers / callOptions', () => {
      expectTypeOf<UseApiQueryOptions<{ id: number }>>().toHaveProperty('query')
      expectTypeOf<UseApiQueryOptions<{ id: number }>>().toHaveProperty('headers')
      expectTypeOf<UseApiQueryOptions<{ id: number }>>().toHaveProperty('callOptions')
    })

    it('exposes UseApiMutationOptions with method / invalidates', () => {
      expectTypeOf<UseApiMutationOptions<unknown, unknown>>().toHaveProperty('method')
      expectTypeOf<UseApiMutationOptions<unknown, unknown>>().toHaveProperty('invalidates')
    })

    it('exposes UseApiInfiniteQueryOptions with limit / query', () => {
      expectTypeOf<UseApiInfiniteQueryOptions<{ id: number }>>().toHaveProperty('limit')
      expectTypeOf<UseApiInfiniteQueryOptions<{ id: number }>>().toHaveProperty('query')
    })

    it('shapes PaginatedResponse<T> as { data: T[], meta }', () => {
      type P = PaginatedResponse<{ id: number }>
      expectTypeOf<P>().toHaveProperty('data')
      expectTypeOf<P>().toHaveProperty('meta')
      expectTypeOf<P['data']>().toEqualTypeOf<{ id: number }[]>()
      expectTypeOf<P['meta']>().toEqualTypeOf<{
        total: number
        limit: number
        offset: number
      }>()
    })
  })
})
