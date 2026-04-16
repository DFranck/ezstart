/**
 * @ezstart/api-sdk/core
 *
 * Framework-agnostic HTTP primitives — zero React dependency.
 *
 * Use this entry point when you only need `apiCall`, `apiStream`,
 * `fetchExternal`, or `createApiClient` without React Query hooks.
 */

export { createApiCall } from './api-call.js'
export { ApiError } from './api-error.js'
export { createApiClient } from './create-client.js'
export type { ApiClient } from './create-client.js'
export { parseApiError, parseApiErrorCode, parseRetryAfter } from './parse-api-error.js'
export { createApiStream } from './stream.js'
export type {
  ApiCallOptions,
  ApiClientConfig,
  ApiErrorPayload,
  ApiMeta,
  BaseUrlResolver,
  ClientLogger,
  EnvelopeConfig,
  HttpMethod,
  QueryParams,
  QueryValue,
  RefreshConfig,
  ResponseType,
  StreamCallbacks,
  TokenStore,
} from './types.js'
