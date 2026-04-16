import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'
import type { PaginatedResponse } from '@ezstart/api-contracts'
import type { ApiError } from '../core/api-error.js'
import type { ApiCallOptions, HttpMethod, QueryParams } from '../core/types.js'

/**
 * Standard paginated response shape — re-exported from
 * `@ezstart/api-contracts` for backward compatibility with consumers that
 * import it from `@ezstart/api-sdk`.
 *
 * Per monorepo convention, every GET list endpoint MUST return:
 * `{ success: true, data: T[], meta: { total, limit, offset } }`.
 *
 * This is the unwrapped shape consumed by `useInfiniteQuery`.
 */
export type { PaginatedResponse }

/**
 * Options accepted by `apiQuery(appName).useQuery`.
 */
export type UseApiQueryOptions<T> = Omit<
  UseQueryOptions<T, ApiError, T, QueryKey>,
  'queryKey' | 'queryFn'
> & {
  query?: QueryParams
  headers?: Record<string, string>
  /** Override call options (e.g. `skipAuth`). */
  callOptions?: Partial<Omit<ApiCallOptions, 'appName' | 'query' | 'headers'>>
}

/**
 * Options accepted by `apiQuery(appName).useMutation`.
 */
export type UseApiMutationOptions<TData, TVars> = Omit<
  UseMutationOptions<TData, ApiError, TVars>,
  'mutationFn'
> & {
  method?: HttpMethod
  invalidates?: readonly QueryKey[]
  headers?: Record<string, string>
  /** Override call options per-mutation (e.g. `skipAuth`). */
  callOptions?: Partial<Omit<ApiCallOptions, 'appName' | 'body' | 'headers'>>
}

/**
 * Options accepted by `apiQuery(appName).useInfiniteQuery`.
 */
export type UseApiInfiniteQueryOptions<T> = Omit<
  UseInfiniteQueryOptions<
    PaginatedResponse<T>,
    ApiError,
    InfiniteData<PaginatedResponse<T>>,
    QueryKey,
    number
  >,
  'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
> & {
  /** Page size. Default `20`. */
  limit?: number
  /** Extra query params merged on each call. */
  query?: QueryParams
  headers?: Record<string, string>
  /** Override call options (e.g. `skipAuth`). `preserveEnvelope` is forced to `true`. */
  callOptions?: Partial<Omit<ApiCallOptions, 'appName' | 'query' | 'headers' | 'preserveEnvelope'>>
}

/**
 * @internal
 *
 * Build a React Query key for an endpoint + params.
 */
function buildQueryKey(appName: string, endpoint: string, query?: QueryParams): QueryKey {
  if (query && Object.keys(query).length > 0) {
    return [appName, endpoint, query] as const
  }
  return [appName, endpoint] as const
}

/**
 * @internal
 *
 * Bound `apiCall` signature consumed by the React Query helpers.
 */
export type BoundApiCall = <T = unknown>(endpoint: string, options?: ApiCallOptions) => Promise<T>

/**
 * @internal
 *
 * Factory: build an `apiQuery(appName)` function bound to a given `apiCall`.
 */
export function createApiQuery(apiCall: BoundApiCall) {
  return function apiQuery(appName: string) {
    return {
      /** Build the query key used for an endpoint/params combination. */
      queryKey(endpoint: string, query?: QueryParams): QueryKey {
        return buildQueryKey(appName, endpoint, query)
      },

      /** React hook: typed `useQuery` against this app. */
      useQuery<T = unknown>(
        endpoint: string,
        options: UseApiQueryOptions<T> = {}
      ): UseQueryResult<T, ApiError> {
        const { query, headers, callOptions, ...queryOptions } = options
        return useQuery<T, ApiError, T, QueryKey>({
          queryKey: buildQueryKey(appName, endpoint, query),
          queryFn: ({ signal }) =>
            apiCall<T>(endpoint, {
              appName,
              query,
              headers,
              signal,
              ...callOptions,
            }),
          ...queryOptions,
        })
      },

      /** React hook: typed `useMutation` against this app. */
      useMutation<TData = unknown, TVars = unknown>(
        endpoint: string,
        options: UseApiMutationOptions<TData, TVars> = {}
      ): UseMutationResult<TData, ApiError, TVars> {
        const queryClient = useQueryClient()
        const { method = 'POST', invalidates, headers, callOptions, onSuccess, ...rest } = options

        return useMutation<TData, ApiError, TVars>({
          ...rest,
          mutationFn: (variables: TVars) =>
            apiCall<TData>(endpoint, {
              appName,
              method,
              body: variables,
              headers,
              ...callOptions,
            }),
          onSuccess: async (data, variables, onMutateResult, context) => {
            if (invalidates && invalidates.length > 0) {
              for (const key of invalidates) {
                await queryClient.invalidateQueries({ queryKey: key })
              }
            }
            return onSuccess?.(data, variables, onMutateResult, context)
          },
        })
      },

      /** React hook: typed `useInfiniteQuery` against this app. */
      useInfiniteQuery<T = unknown>(
        endpoint: string,
        options: UseApiInfiniteQueryOptions<T> = {}
      ): UseInfiniteQueryResult<InfiniteData<PaginatedResponse<T>>, ApiError> {
        const { limit = 20, query, headers, callOptions, ...rqOptions } = options
        return useInfiniteQuery<
          PaginatedResponse<T>,
          ApiError,
          InfiniteData<PaginatedResponse<T>>,
          QueryKey,
          number
        >({
          ...rqOptions,
          queryKey: buildQueryKey(appName, endpoint, { ...query, limit }),
          queryFn: ({ pageParam, signal }) =>
            apiCall<PaginatedResponse<T>>(endpoint, {
              appName,
              query: { ...query, limit, offset: pageParam },
              headers,
              signal,
              preserveEnvelope: true,
              ...callOptions,
            }),
          initialPageParam: 0,
          getNextPageParam: last => {
            const nextOffset = last.meta.offset + last.meta.limit
            return nextOffset < last.meta.total ? nextOffset : undefined
          },
        })
      },
    }
  }
}
