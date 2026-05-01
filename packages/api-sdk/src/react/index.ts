/**
 * @ezstart/api-sdk/react
 *
 * React Query helpers (hooks + types). Requires `@tanstack/react-query`
 * and `react` peer dependencies.
 */

export { createApiQuery, type BoundApiCall } from './react-query.js'

export type {
  PaginatedResponse,
  UseApiInfiniteQueryOptions,
  UseApiMutationOptions,
  UseApiQueryOptions,
} from './react-query.js'

export { useMaintenanceStatus } from './use-maintenance-status.js'
export type { MaintenanceStatus, UseMaintenanceStatusOptions } from './use-maintenance-status.js'
