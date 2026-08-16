# @ezstart/api-sdk

Unified HTTP client with typed errors, envelope unwrap, token refresh, React Query hooks, and SSE streaming. Publishable on npm; works standalone in any project.

## Install

```bash
npm install @ezstart/api-sdk
# Optional peer deps for the React Query hooks:
npm install react @tanstack/react-query
```

## Quickstart — apiCall in vanilla TS

The framework-agnostic core. Throws `ApiError` on any non-2xx response, returns the unwrapped `data` field on success.

```ts
import { apiCall, ApiError } from '@ezstart/api-sdk/core'

try {
  const user = await apiCall<User>('/users/me', {
    appName: 'myapp',
    baseUrl: 'https://api.example.com',
  })
  console.log(user)
} catch (err) {
  if (ApiError.isApiError(err)) {
    console.error(err.code, err.message, err.status)
  }
}
```

For full agnostic control, build your own client via `createApiClient`:

```ts
import { createApiClient } from '@ezstart/api-sdk/core'

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

## Quickstart — apiQuery in React

React Query bindings with stable cache keys + auto auth header injection.

```tsx
'use client'
import { apiQuery } from '@ezstart/api-sdk/react'

const api = apiQuery('myapp')

function InvoicesList() {
  const { data, isLoading } = api.useQuery<Invoice[]>('/invoices', {
    query: { page: 1 },
    staleTime: 60_000,
  })

  const create = api.useMutation<Invoice, CreateInput>('/invoices', {
    method: 'POST',
    invalidates: [api.queryKey('/invoices')],
  })

  if (isLoading) return <p>Loading…</p>
  return (
    <ul>
      {data.map(inv => (
        <li key={inv.id}>{inv.number}</li>
      ))}
    </ul>
  )
}
```

For paginated lists:

```tsx
const { data, fetchNextPage } = api.useInfiniteQuery<Item>('/items', { limit: 20 })
```

Query keys are built as `[appName, endpoint]` or `[appName, endpoint, query]` for stable cache hits across re-renders.

## Quickstart — Integrations

Drop-in third-party service wrappers from `@ezstart/api-sdk/integrations`.

```tsx
'use client'
import { TurnstileWidget } from '@ezstart/api-sdk/integrations'
;<TurnstileWidget
  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
  onVerify={token => console.log('verified', token)}
  onError={err => console.error(err)}
/>
```

`TurnstileWidget` renders nothing when `siteKey` is empty so you can ship without captcha and enable it later via env var. Lazy-injects the Cloudflare script (idempotent), supports HMR / StrictMode unmount, and accepts a silent-by-default `logger` prop.

## API

### `apiCall<T>(endpoint, options): Promise<T>`

JSON-first HTTP call. Throws `ApiError` on any non-2xx or network failure. Unwraps the `{ success, data, meta }` envelope so callers receive `data` directly.

Key options: `appName`, `method`, `body` (JSON / FormData / URLSearchParams / string), `query`, `headers`, `signal`, `skipAuth`, `skipRefresh`, `credentials`, `responseType` (`'json' | 'text' | 'blob' | 'arrayBuffer' | 'raw'`), `preserveEnvelope`, `baseUrl`, `getToken`.

```ts
const blob = await apiCall<Blob>('/files/123', {
  appName: 'myapp',
  responseType: 'blob',
})
```

### `apiStream(endpoint, options): Promise<void>`

Server-Sent Events. Parses `data:` events (multi-line + `[DONE]` sentinel + `event: error`), invokes `onChunk` / `onError` / `onDone`, retries once on 401 after refresh.

```ts
await apiStream('/chat/stream', {
  appName: 'myapp',
  method: 'POST',
  body: { prompt: 'Hello' },
  onChunk: chunk => append(chunk),
  onDone: () => finalize(),
})
```

### `apiQuery(appName)` — React Query hooks

```tsx
const api = apiQuery('myapp')

api.useQuery<Item[]>('/items', { query: { page: 1 } })
api.useMutation<Item, CreateInput>('/items', { method: 'POST' })
api.useInfiniteQuery<Item>('/items', { limit: 20 }) // auto offset/limit
api.queryKey('/items', { page: 1 }) // for invalidation
```

### `fetchExternal<T>(url, init?): Promise<T>`

Explicit escape hatch for 3rd-party APIs. No auth injection, no URL resolution, no envelope unwrap — just `fetch` + JSON parse + `ApiError` on non-2xx.

Exported from both the root and the `./core` entry point. In a server context
(no React peer deps installed), import from `./core` to avoid pulling the
root's static React Query re-exports:

```ts
// Server-side (Node API, no React): import from /core
import { fetchExternal } from '@ezstart/api-sdk/core'

const repo = await fetchExternal<Repo>('https://api.github.com/repos/vercel/next.js')
```

### `createApiClient(config): ApiClient`

Factory for fully agnostic clients. Returns `{ apiCall, apiStream, apiQuery, config, __resetRefresh }` bound to the provided `ApiClientConfig` (baseUrl / tokenStore / refresh / envelope / pathPrefix / logger / csrfConfig).

#### `csrfConfig` — CSRF double-submit for cookie-auth writes

When set, `apiCall` attaches the `X-CSRF-Token` header (read from the `csrf-token` cookie) on state-changing cookie-auth requests (POST/PUT/PATCH/DELETE with `credentials: 'include'` and no `Authorization: Bearer`). It primes the cookie on cache miss via `primeUrl`. On a `403`, it peeks the response body and re-primes + retries **once** only when the body confirms a CSRF mismatch — a genuine `403` (email-verify gate, RBAC denial, etc.) propagates to the caller unchanged, with no wasted prime GET / retry POST. GET/HEAD and Bearer requests are untouched. Omit to disable (default — backward compatible).

```ts
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  csrfConfig: {
    primeUrl: 'https://api.example.com/api/auth/login-cookie/csrf',
    // cookieName: 'csrf-token', // default
    // headerName: 'X-CSRF-Token', // default
    // mismatchMatcher: (status, body) => ..., // default: matches 'csrf' in the parsed message/code
  },
})

// Cookie-auth write → SDK reads the cookie, attaches X-CSRF-Token, primes on miss.
await client.apiCall('/account/change-email', { method: 'POST', body: { email: 'a@b.c' } })
```

The default `mismatchMatcher` looks for `'csrf'` (case-insensitive) in the parsed error message or code, matching the `@ezstart/api-core` server (`'CSRF token mismatch'`). Override it when the upstream server signals CSRF mismatches with a different message/code.

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

### `parseApiError(body)` / `parseApiErrorCode(body)` / `parseRetryAfter(body)`

Utilities for extracting a readable message, machine code, or retry hint from any wire error payload (Zod details → nested `error.message` → flat string → fallback).

### Entry points

| Entry point                     | Content                              | React required |
| ------------------------------- | ------------------------------------ | -------------- |
| `@ezstart/api-sdk`              | Everything (core + react)            | Yes (peer)     |
| `@ezstart/api-sdk/core`         | Agnostic primitives only             | No             |
| `@ezstart/api-sdk/react`        | React Query hooks + types            | Yes            |
| `@ezstart/api-sdk/integrations` | Third-party React wrappers (captcha) | Yes            |

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

- Never use raw `fetch()` inside apps — use `apiCall` (internal APIs) or `fetchExternal` (3rd-party APIs).
- Never swallow `ApiError` silently — surface `err.message` via toast.
- Always pass `appName` to `apiCall` in monorepo apps; it drives URL resolution and React Query keys.

## Related

- [`@ezstart/api-contracts`](../api-contracts) — wire shapes (envelope, errors, pagination, auth) consumed by this SDK.
- [`@ezstart/auth-sdk`](../auth-sdk) — Authentication SDK built on top of this client.
