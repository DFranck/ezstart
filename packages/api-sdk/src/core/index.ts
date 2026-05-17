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

/**
 * Signal that the user has logged out. Every in-flight refresh started
 * before this call will discard its result instead of writing fresh tokens
 * back to the token store.
 *
 * MUST be called BEFORE clearing the token store by any session-managing
 * consumer (e.g. `@ezstart/auth-sdk`'s `logout()`). Wires the CRIT-2 fix
 * end-to-end so a refresh in-flight at logout time cannot silently
 * re-hydrate the user post-logout.
 *
 * @internal — exported for SDK consumers that own a token store.
 *             Not part of the public API contract.
 */
export { bumpLogoutEpoch } from './internal/refresh.js'
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
