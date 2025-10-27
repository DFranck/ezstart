# @ezstart/fetch-client

Type-safe HTTP client for the @ezstart monorepo with automatic URL resolution and error handling.

## Overview

`@ezstart/fetch-client` provides a centralized HTTP client that automatically resolves API URLs from `@ezstart/config` and handles common API patterns like JSON serialization, error logging, and request cancellation.

## Installation

This package is automatically included in all @ezstart applications:

```json
{
  "dependencies": {
    "@ezstart/fetch-client": "workspace:*"
  }
}
```

## Quick Start

### Basic Usage

```typescript
import { callApi } from '@ezstart/fetch-client'

// GET request
const response = await callApi<User[]>('/users', {
  appName: 'ezbill'
})

if (response.ok) {
  console.log('Users:', response.data)
} else {
  console.error('Error:', response.data?.error)
}
```

### POST Request

```typescript
const response = await callApi<User>('/users', {
  appName: 'ezbill',
  method: 'POST',
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  }
})
```

### With Query Parameters

```typescript
const response = await callApi<Invoice[]>('/invoices', {
  appName: 'ezbill',
  query: {
    status: 'paid',
    limit: 10
  }
})
// URL: https://ezbill-api.up.railway.app/api/invoices?status=paid&limit=10
```

### With Custom Headers

```typescript
const response = await callApi<Payment>('/payments', {
  appName: 'ezpay',
  method: 'POST',
  headers: {
    'X-Idempotency-Key': 'unique-key-123'
  },
  body: { amount: 100 }
})
```

### With AbortSignal

```typescript
const controller = new AbortController()

const response = await callApi<Data>('/data', {
  appName: 'monitoring',
  signal: controller.signal
})

// Cancel request
controller.abort()
```

## API Reference

### `callApi<T>(endpoint: string, options: CallApiOptions): Promise<ApiResponse<T>>`

Main function to make HTTP requests to @ezstart APIs.

#### Parameters

- **endpoint** (string): API endpoint path (e.g., `/users`, `/invoices/123`)
- **options** (CallApiOptions):
  - **appName** (AppName, required): App name to resolve API URL (`'ezauth' | 'ezbill' | 'ezpay' | ...`)
  - **method** (HttpMethod, optional): HTTP method (default: `'GET'`)
  - **query** (Record<string, any>, optional): Query parameters
  - **body** (any, optional): Request body (auto-serialized to JSON)
  - **headers** (Record<string, string>, optional): Custom headers
  - **signal** (AbortSignal, optional): For request cancellation
  - **userId** (string, optional): Adds `X-User-Id` header

#### Returns

`Promise<ApiResponse<T>>` where:

```typescript
type ApiResponse<T> =
  | { ok: true; status: number; url: string; data: T }
  | { ok: false; status: number; url: string; data: ApiError | null }
```

## App-Specific Wrappers

For better DX, create a wrapper in each app that auto-fills `appName`:

```typescript
// apps/ezbill/web/src/utils/api.ts
import { callApi as baseCallApi, type CallApiOptions } from '@ezstart/fetch-client'

export async function callApi<T = any>(
  endpoint: string,
  options: Omit<CallApiOptions, 'appName'> = {}
) {
  return baseCallApi<T>(endpoint, { ...options, appName: 'ezbill' })
}

// Re-export types
export type { ApiResponse, ApiError, HttpMethod } from '@ezstart/fetch-client'
```

Usage in app:

```typescript
import { callApi } from '@/utils/api'

// appName auto-filled!
const response = await callApi<Invoice[]>('/invoices')
```

## Features

### ✅ Automatic URL Resolution

URLs are automatically resolved from `@ezstart/config` based on environment:

```typescript
// Local: http://localhost:5020/api/invoices
// Prod: https://ezbill-api.up.railway.app/api/invoices
const response = await callApi('/invoices', { appName: 'ezbill' })
```

### ✅ Automatic /api Prefix

The `/api` prefix is automatically normalized:

```typescript
// All equivalent:
callApi('/users', { appName: 'ezauth' })
callApi('/api/users', { appName: 'ezauth' })
callApi('users', { appName: 'ezauth' })
// → https://ezauth-api.up.railway.app/api/users
```

### ✅ Type Safety

Full TypeScript support with generic response types:

```typescript
interface User {
  id: string
  name: string
  email: string
}

const response = await callApi<User[]>('/users', { appName: 'ezauth' })

if (response.ok) {
  // response.data is typed as User[]
  response.data.forEach(user => console.log(user.name))
}
```

### ✅ Error Handling

Detailed error logging for debugging:

```typescript
const response = await callApi('/invalid', { appName: 'ezbill' })

if (!response.ok) {
  // Logs to console:
  // [callApi] API returned !ok
  // [callApi] Method: GET
  // [callApi] URL: http://localhost:5020/api/invalid
  // [callApi] Status: 404
  // [callApi] Response: { error: 'Not found' }

  console.error(response.data?.error)
}
```

### ✅ Request Cancellation

Built-in support for AbortController:

```typescript
const controller = new AbortController()

setTimeout(() => controller.abort(), 5000) // Cancel after 5s

const response = await callApi('/slow-endpoint', {
  appName: 'monitoring',
  signal: controller.signal
})
```

## Migration from @ezstart/ui/utils

If migrating from the old `@ezstart/ui/utils` package:

```typescript
// Before
import { callApi } from '@ezstart/ui/utils'

const response = await callApi('/users', {
  appName: 'ezbill' // Optional
})

// After
import { callApi } from '@ezstart/fetch-client'

const response = await callApi('/users', {
  appName: 'ezbill' // Required
})
```

**Breaking changes:**
- ✅ `appName` is now required (no more fallback to env vars)
- ✅ No more `getApiUrl` dependency (fully self-contained)

## Best Practices

### 1. Use App Wrappers

Create a wrapper in each app to avoid repetition:

```typescript
// ✅ Good
import { callApi } from '@/utils/api' // Wrapper with appName
const response = await callApi('/users')

// ❌ Avoid
import { callApi } from '@ezstart/fetch-client'
const response = await callApi('/users', { appName: 'ezbill' })
```

### 2. Type Your Responses

Always provide type parameters for better type safety:

```typescript
// ✅ Good
const response = await callApi<Invoice[]>('/invoices', { appName: 'ezbill' })

// ❌ Avoid
const response = await callApi('/invoices', { appName: 'ezbill' }) // any
```

### 3. Handle Errors Gracefully

Check `response.ok` before accessing data:

```typescript
// ✅ Good
const response = await callApi<User>('/users/123', { appName: 'ezauth' })
if (response.ok) {
  return response.data
} else {
  toast.error(response.data?.error || 'Failed to fetch user')
  return null
}

// ❌ Avoid
const response = await callApi<User>('/users/123', { appName: 'ezauth' })
return response.data // Might be ApiError!
```

### 4. Use with React Query

Perfect companion for `@tanstack/react-query`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { callApi } from '@/utils/api'

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await callApi<User[]>('/users')
      if (!response.ok) throw new Error(response.data?.error || 'Failed')
      return response.data
    }
  })
}
```

## Applications Using This Package

All @ezstart applications use this HTTP client:

- ✅ **ezbill/web** - Invoicing API calls
- ✅ **ezpay/web** - Payment API calls
- ✅ **tower-defense/web** - Game API calls
- ✅ **green-pulse/web** - Forms API calls
- ✅ **ezauth/web** - Authentication API calls
- ✅ **ezstart/web** - Monitoring API calls
- ✅ **fengshui/web** - Analysis API calls

## Related Packages

- [`@ezstart/config`](../config/README.md) - URL configuration and app registry
- [`@ezstart/ui`](../ui/README.md) - UI components (removed callApi in v2.0)
- [`@ezstart/auth-sdk`](../auth-sdk/README.md) - Uses fetch-client internally

## Development

### Building the Package

```bash
# Build TypeScript
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck
```

### Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

## License

MIT
