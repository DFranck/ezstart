# @ezstart/api-sdk

Unified HTTP client — typed errors, envelope unwrap, token refresh, React Query + SSE helpers. Publishable on npm; works standalone in any project.

## Install

```bash
pnpm add @ezstart/api-sdk
# optional peer dependencies (only for `apiQuery`)
pnpm add react @tanstack/react-query
```

## Quickstart (monorepo)

The package ships pre-configured bindings for the `@ezstart` monorepo (`getApiUrl` base URL resolver, `ezauth-storage` token store, EZAuth refresh endpoint, `@ezstart/logger`).

```ts
import { apiCall, apiQuery, ApiError } from '@ezstart/api-sdk'

// Imperative — throws ApiError on failure, returns unwrapped data on success
const user = await apiCall<User>('/users/me', { appName: 'myapp' })

// React Query helpers (uses @tanstack/react-query peer dep)
const api = apiQuery('myapp')
const { data } = api.useQuery<Invoice[]>('/invoices', { query: { page: 1 } })
```

## Quickstart (external / standalone)

Build your own agnostic client via the factory — no `@ezstart/*` imports required.

```ts
import { createApiClient } from '@ezstart/api-sdk'

const client = createApiClient({
  baseUrl: 'https://api.example.com',
  pathPrefix: '/v1',
  tokenStore: {
    getAccessToken: () => localStorage.getItem('jwt'),
    getRefreshToken: () => localStorage.getItem('rt'),
    setTokens: ({ accessToken, refreshToken }) => {
      localStorage.setItem('jwt', accessToken)
      localStorage.setItem('rt', refreshToken)
    },
  },
  refresh: { endpoint: 'https://auth.example.com/refresh' },
  envelope: { unwrap: true, throwOnFailureEnvelope: true },
})

const user = await client.apiCall<User>('/users/me')
```

## API

### `apiCall<T>(endpoint, options): Promise<T>`

JSON-first HTTP call. Throws `ApiError` on any non-2xx or network failure. Unwraps `{ success, data, meta }` envelope so callers get `data` directly.

Key options: `appName`, `method`, `body` (JSON / FormData / URLSearchParams / string), `query`, `headers`, `signal`, `skipAuth`, `skipRefresh`, `credentials`, `responseType` (`'json' | 'text' | 'blob' | 'arrayBuffer' | 'raw'`), `preserveEnvelope`, `baseUrl`, `getToken`.

### `apiStream(endpoint, opts): Promise<void>`

Server-Sent Events. Parses `data:` events (multi-line + `[DONE]` sentinel + `event: error`), invokes `onChunk` / `onError` / `onDone`, retries once on 401 after refresh.

```ts
await apiStream('/chat/stream', {
  appName: 'myapp',
  method: 'POST',
  body: { prompt: 'Hello' },
  onChunk: chunk => {
    /* append to UI */
  },
  onDone: () => {
    /* finalize */
  },
})
```

### `apiQuery(appName)` — React Query

```tsx
const api = apiQuery('myapp')

api.useQuery<Item[]>('/items', { query: { page: 1 }, staleTime: 60_000 })
api.useMutation<Item, CreateInput>('/items', {
  method: 'POST',
  invalidates: [api.queryKey('/items')],
})
api.useInfiniteQuery<Item>('/items', { limit: 20 }) // auto offset/limit pagination
```

Query keys are built as `[appName, endpoint]` or `[appName, endpoint, query]` for stable cache hits.

### `fetchExternal<T>(url, init?): Promise<T>`

Explicit escape hatch for 3rd-party APIs (GitHub, npm, etc.). No auth injection, no URL resolution, no envelope unwrap — just `fetch` + JSON parse + `ApiError` on non-2xx.

```ts
const repo = await fetchExternal<Repo>('https://api.github.com/repos/vercel/next.js')
```

### `createApiClient(config): ApiClient`

Factory for fully agnostic clients. Returns `{ apiCall, apiStream, apiQuery, config, __resetRefresh }` bound to the provided `ApiClientConfig` (baseUrl / tokenStore / refresh / envelope / pathPrefix / logger).

### `ApiError`

```ts
class ApiError extends Error {
  status: number // HTTP status (0 for network errors)
  code?: string // e.g. 'RATE_LIMIT_EXCEEDED'
  data?: unknown // raw parsed body
  retryAfter?: number // seconds (for 429)
  static isApiError(value: unknown): value is ApiError
}
```

### `parseApiError(body) / parseApiErrorCode(body) / parseRetryAfter(body)`

Utilities for extracting a readable message, machine code, or retry hint from any wire error payload (Zod details → nested `error.message` → flat string → fallback).

## Migration from `@ezstart/fetch-client`

| Before (`@ezstart/fetch-client`)                       | After (`@ezstart/api-sdk`)                               |
| ------------------------------------------------------ | -------------------------------------------------------- |
| `callApi('/x', { appName })`                           | `apiCall('/x', { appName })`                             |
| `const res = await callApi(...); if (!res.ok) { ... }` | `try { const data = await apiCall(...) } catch (err) {}` |
| `res.data` (on success)                                | return value (unwrapped)                                 |
| `parseApiError(res.data)` on failure                   | `err.message` (already parsed)                           |
| `createCallApi(appName)` + manual React Query wiring   | `apiQuery(appName).useQuery / useMutation`               |
| `fetch('https://api.github.com/...')`                  | `fetchExternal('https://api.github.com/...')`            |

## Rules

- Never use raw `fetch()` inside apps — use `apiCall` (internal APIs) or `fetchExternal` (3rd-party APIs). A future lint rule will enforce this.
- Never swallow `ApiError` silently — surface `err.message` via toast.
- Always pass `appName` to `apiCall` in monorepo apps; it drives URL resolution and React Query keys.

## Related

- [.claude/rules/package-standard.md](../../.claude/rules/package-standard.md) — the standard this package follows
- [.claude/rules/api.md](../../.claude/rules/api.md) — API conventions
- [@ezstart/api-contracts](../api-contracts/README.md) — wire shapes (envelope, errors, pagination, auth) consumed by this SDK
