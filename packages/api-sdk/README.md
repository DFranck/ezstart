# @ezstart/api-sdk

Unified HTTP client for the `@ezstart` monorepo. Replaces `@ezstart/fetch-client` with a
single entry point that throws typed errors, unwraps envelope responses, handles token
refresh, and ships React Query + SSE stream helpers.

## Why

`@ezstart/fetch-client` returned discriminated union results (`{ ok: true, data } | { ok: false, data }`)
which encouraged callers to handroll error handling — and too often produced `[object Object]`
toasts, bypassed refresh, or fell back to raw `fetch()`.

`api-sdk` centralizes everything:

- Throws typed `ApiError` with a human-readable `message` (already parsed via `parseApiError`).
- Unwraps `{ success, data, meta }` envelope — callers get `data` directly.
- Single-flight refresh-on-401 with one retry.
- `fetchExternal` is the **explicit** escape hatch for 3rd-party APIs; a future lint rule
  will forbid raw `fetch()` outside this package.

## Exports

```ts
import {
  apiCall,
  ApiError,
  apiQuery,
  apiStream,
  fetchExternal,
  parseApiError,
  parseApiErrorCode,
} from '@ezstart/api-sdk'
```

### `apiCall<T>(endpoint, options)`

```ts
const user = await apiCall<User>('/users/me', { appName: 'ezauth' })

const invoice = await apiCall<Invoice>('/invoices', {
  appName: 'ezbill',
  method: 'POST',
  body: { amount: 100 },
})

const list = await apiCall<Item[]>('/items', {
  appName: 'green-pulse',
  query: { page: 1, limit: 20 },
})
```

Key options:

| Option        | Default     | Purpose                                            |
| ------------- | ----------- | -------------------------------------------------- |
| `appName`     | (required)  | Resolves base URL via `@ezstart/config`.           |
| `method`      | `'GET'`     | HTTP method.                                       |
| `body`        | —           | JSON-serialized (FormData/URLSearchParams as-is).  |
| `query`       | —           | URL params; `undefined`/`null` skipped.            |
| `skipAuth`    | `false`     | Skip `Authorization: Bearer` injection.            |
| `skipRefresh` | `false`     | Skip automatic refresh-on-401 retry.               |
| `credentials` | `'include'` | Cookie mode.                                       |
| `baseUrl`     | —           | Override base URL (testing only).                  |
| `getToken`    | —           | Custom token resolver (default: `ezauth-storage`). |

### `fetchExternal<T>(url, init?)`

Explicit helper for GitHub / npm / other 3rd-party APIs. No auth, no URL resolution,
no envelope unwrap — just `fetch` + JSON parse + `ApiError` on non-2xx.

```ts
const repo = await fetchExternal<GitHubRepo>('https://api.github.com/repos/vercel/next.js')
```

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

### `apiQuery(appName)` — React Query helpers

```tsx
const api = apiQuery('green-pulse')

function Users() {
  const { data, isLoading } = api.useQuery<User[]>('/users', {
    query: { page: 1 },
    staleTime: 60_000,
  })

  const create = api.useMutation<User, CreateUserInput>('/users', {
    method: 'POST',
    invalidates: [api.queryKey('/users')],
  })
}
```

Query keys are built as `[appName, endpoint]` or `[appName, endpoint, query]` for
consistent cache hits across the app.

### `apiStream(endpoint, opts)` — Server-Sent Events

```ts
await apiStream('/chat/stream', {
  appName: 'ezstart',
  method: 'POST',
  body: { prompt: 'Hello' },
  onChunk: data => console.log(data),
  onDone: () => console.log('done'),
})
```

Parses `data:` events, JSON-decodes each one, and honors the `data: [DONE]` sentinel.
Retries once on 401 after refresh.

## Migration from `@ezstart/fetch-client`

| Before (`@ezstart/fetch-client`)                       | After (`@ezstart/api-sdk`)                               |
| ------------------------------------------------------ | -------------------------------------------------------- |
| `callApi('/x', { appName })`                           | `apiCall('/x', { appName })`                             |
| `const res = await callApi(...); if (!res.ok) { ... }` | `try { const data = await apiCall(...) } catch (err) {}` |
| `res.data` (on success)                                | return value                                             |
| `parseApiError(res.data)` on failure                   | `err.message` (already parsed)                           |
| `createCallApi(appName)` + manual React Query wiring   | `apiQuery(appName).useQuery / useMutation`               |
| `fetch('https://api.github.com/...')`                  | `fetchExternal('https://api.github.com/...')`            |

## Rules

- Never use raw `fetch()` inside apps — use `apiCall` (internal APIs) or `fetchExternal`
  (3rd-party APIs). Raw `fetch` in `node_modules` and this package's internals is fine.
- Never swallow `ApiError` silently; surface `.message` in toasts (`toast.error(err.message)`).
- Always provide `appName` to `apiCall` — it drives URL resolution and React Query keys.
- See [DEV-RULES.md](../../DEV-RULES.md) and [.claude/rules/api.md](../../.claude/rules/api.md).

## Peer dependencies

React Query and React are **optional** peer dependencies — required only when you use
`apiQuery`. `apiCall`, `apiStream`, `fetchExternal`, `parseApiError`, and `ApiError`
work in any environment (Node, browser, workers).

```json
"peerDependencies": {
  "@tanstack/react-query": "^5.0.0",
  "react": "^18.0.0 || ^19.0.0"
}
```
