# @ezstart/fetch-client

Type-safe HTTP client for @ezstart monorepo with automatic API URL resolution and error parsing.

## Features

- ✅ Type-safe API calls with TypeScript generics
- ✅ Automatic URL resolution from `@ezstart/config`
- ✅ Automatic `/api` prefix normalization
- ✅ JSON body serialization
- ✅ Error parsing with `parseApiError()` - **NO MORE `[object Object]`** ✅
- ✅ **Configurable logging** (none/errors/all) - Debug API calls easily
- ✅ httpOnly cookie support (`credentials: 'include'`)
- ✅ AbortSignal support for request cancellation

## Installation

This package is automatically included in all @ezstart web apps:

```json
{
  "dependencies": {
    "@ezstart/fetch-client": "workspace:*"
  }
}
```

## Usage

### Basic GET Request

```typescript
import { callApi } from '@/utils/api' // App-specific wrapper

const response = await callApi<User[]>('/users')

if (response.ok) {
  console.log('Users:', response.data) // Type: User[]
} else {
  console.error('Error:', response.data) // Type: ApiError | null
}
```

### POST Request with Body

```typescript
import { callApi, parseApiError } from '@/utils/api'
import { toast } from 'sonner'

const response = await callApi<User>('/users', {
  method: 'POST',
  body: { name: 'John', email: 'john@example.com' }
})

if (response.ok) {
  toast.success('User created!')
  console.log('Created user:', response.data)
} else {
  // ✅ Parse error correctly (NO MORE "[object Object]")
  const errorMessage = parseApiError(response.data)
  toast.error(errorMessage) // Shows: "User email already exists"
}
```

### With Query Parameters

```typescript
const response = await callApi<Invoice[]>('/invoices', {
  query: { status: 'paid', limit: 10 }
})
// Calls: http://localhost:5020/api/invoices?status=paid&limit=10
```

## Error Handling

### ❌ Before (Shows "[object Object]")

```typescript
const response = await callApi('/users', { method: 'POST', body })

if (!response.ok) {
  toast.error(response.data) // ❌ [object Object]
}
```

### ✅ After (Shows actual message)

```typescript
import { parseApiError } from '@/utils/api'

const response = await callApi('/users', { method: 'POST', body })

if (!response.ok) {
  const errorMessage = parseApiError(response.data)
  toast.error(errorMessage) // ✅ "User email already exists"
}
```

### Error Formats Supported

`parseApiError()` handles all these formats automatically:

```typescript
// Rate limit errors
{ error: { message: "Too many requests", code: "RATE_LIMIT_EXCEEDED", retryAfter: 900 } }
// → "Too many requests"

// Validation errors
{ error: { message: "Invalid email format", code: "VALIDATION_ERROR" } }
// → "Invalid email format"

// Standard errors
{ error: "Invalid credentials" }
// → "Invalid credentials"

// Legacy errors
{ message: "User not found" }
// → "User not found"

// Null/undefined
null
// → "An unexpected error occurred. Please try again."
```

## API Reference

### `callApi<T>(endpoint, options)`

Makes a type-safe HTTP request to the API.

**Parameters:**
- `endpoint` (string): API endpoint (e.g., `/users`, `/invoices/123`)
- `options` (CallApiOptions):
  - `method?` (HttpMethod): 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' (default: 'GET')
  - `query?` (Record<string, any>): Query parameters
  - `body?` (any): Request body (will be JSON.stringified)
  - `headers?` (Record<string, string>): Custom headers
  - `signal?` (AbortSignal): Abort controller signal
  - `userId?` (string): User ID for X-User-Id header
  - `appName` (AppName): **REQUIRED** - App name for URL resolution

**Returns:** `Promise<ApiResponse<T>>`

**Type:** 
```typescript
ApiResponse<T> = 
  | { ok: true; status: number; url: string; data: T }
  | { ok: false; status: number; url: string; data: ApiError | null }
```

### `parseApiError(errorData)`

Parses API error response into human-readable message (always in English).

**Parameters:**
- `errorData` (ApiError | null | undefined): Error data from API response

**Returns:** `string` - Human-readable error message

**Always returns English messages** for consistency across the monorepo.

## App-Specific Wrappers

Each app has a wrapper that automatically injects the `appName`:

```typescript
// apps/ezbill/web/src/utils/api.ts
export async function callApi<T = any>(
  endpoint: string,
  options: Omit<CallApiOptions, 'appName'> = {}
) {
  return baseCallApi<T>(endpoint, { ...options, appName: 'ezbill' })
}
```

This allows cleaner code in components:

```typescript
// ❌ Without wrapper
await callApi('/users', { appName: 'ezbill', method: 'POST', body })

// ✅ With wrapper
await callApi('/users', { method: 'POST', body }) // appName auto-injected
```

## Integration with `runWithFeedback()`

**CRITICAL:** When using `runWithFeedback()` from `@ezstart/ui`, you MUST use `parseApiError()` when throwing errors:

### ❌ WRONG - Generic error message

```typescript
import { runWithFeedback } from '@ezstart/ui/utils'

await runWithFeedback({
  action: async () => {
    const res = await callApi('/clients', { method: 'POST', body })
    if (!res.ok) throw new Error('Failed to create client') // ❌ Generic message
    return res.data
  },
  toastError: { message: 'Failed to create client' }
})
```

**Result:** User sees generic "Failed to create client" instead of actual API error like "Email already exists"

### ✅ CORRECT - Real API error message

```typescript
import { runWithFeedback } from '@ezstart/ui/utils'
import { parseApiError } from '@/utils/api'

await runWithFeedback({
  action: async () => {
    const res = await callApi('/clients', { method: 'POST', body })
    if (!res.ok) throw new Error(parseApiError(res.data)) // ✅ Parse API error
    return res.data
  },
  toastError: { message: 'An error occurred' } // Fallback only
})
```

**Result:** User sees actual API error: "Client email already exists" ✅

### Why This Matters

`runWithFeedback()` catches errors and displays `error.message` in toast:

```typescript
// Inside runWithFeedback (simplified)
try {
  const result = await action()
  return result
} catch (e) {
  toast.error(e.message) // ← Uses error.message from thrown Error
}
```

**Without `parseApiError()`:**
- Thrown error: `new Error('Failed to create client')`
- User sees: "Failed to create client" (generic, not helpful)

**With `parseApiError()`:**
- Thrown error: `new Error(parseApiError(res.data))` → `new Error('Client email already exists')`
- User sees: "Client email already exists" (specific, actionable)

## Best Practices

### 1. Always use `parseApiError()` when throwing errors

```typescript
// ✅ Good - Real API error message
const res = await callApi('/users', { method: 'POST', body })
if (!res.ok) throw new Error(parseApiError(res.data))

// ❌ Bad - Generic hardcoded message
const res = await callApi('/users', { method: 'POST', body })
if (!res.ok) throw new Error('Failed to create user')
```

### 2. Always use `parseApiError()` for direct toast display

```typescript
// ✅ Good
const errorMessage = parseApiError(response.data)
toast.error(errorMessage)

// ❌ Bad
toast.error(response.data) // Shows [object Object]
```

### 3. Use TypeScript generics for type safety

```typescript
// ✅ Good - Type-safe
const response = await callApi<User[]>('/users')
if (response.ok) {
  response.data.forEach(user => console.log(user.name)) // ✅ Autocomplete works
}

// ❌ Bad - No type safety
const response = await callApi('/users')
if (response.ok) {
  response.data.forEach(user => console.log(user.name)) // ❌ No autocomplete
}
```

### 4. Handle both success and error cases

```typescript
const response = await callApi<User>('/users/123')

if (response.ok) {
  // ✅ Handle success
  console.log('User:', response.data)
} else {
  // ✅ Handle error
  const errorMessage = parseApiError(response.data)
  console.error('Failed to fetch user:', errorMessage)
}
```

## Examples

### Complete CRUD Example

```typescript
import { callApi, parseApiError } from '@/utils/api'
import { toast } from 'sonner'

// CREATE
async function createUser(data: CreateUserInput) {
  const response = await callApi<User>('/users', {
    method: 'POST',
    body: data
  })

  if (response.ok) {
    toast.success('User created!')
    return response.data
  } else {
    toast.error(parseApiError(response.data))
    return null
  }
}

// READ
async function getUser(id: string) {
  const response = await callApi<User>(`/users/${id}`)

  if (response.ok) {
    return response.data
  } else {
    toast.error(parseApiError(response.data))
    return null
  }
}

// UPDATE
async function updateUser(id: string, data: UpdateUserInput) {
  const response = await callApi<User>(`/users/${id}`, {
    method: 'PUT',
    body: data
  })

  if (response.ok) {
    toast.success('User updated!')
    return response.data
  } else {
    toast.error(parseApiError(response.data))
    return null
  }
}

// DELETE
async function deleteUser(id: string) {
  const response = await callApi(`/users/${id}`, {
    method: 'DELETE'
  })

  if (response.ok) {
    toast.success('User deleted!')
    return true
  } else {
    toast.error(parseApiError(response.data))
    return false
  }
}
```

## Related Packages

- `@ezstart/config` - API URL configuration
- `@ezstart/ui` - Toast notifications (`sonner`)
- `@ezstart/types` - Shared TypeScript types

## Logging

`callApi()` now supports configurable logging to help debug API issues!

### Log Levels

- **`'none'`** - No logging at all
- **`'errors'`** - Only log failed requests (default)
- **`'all'`** - Log all requests + responses (verbose)

### Enable Logging Globally

In browser console:

```javascript
// Enable full logging for all callApi calls
localStorage.setItem('callApiLogLevel', 'all')

// Disable all logging
localStorage.setItem('callApiLogLevel', 'none')

// Only log errors (default)
localStorage.setItem('callApiLogLevel', 'errors')
```

### Enable Logging Per-Request

```typescript
// Log this specific request
const response = await callApi<User>('/users/123', {
  logLevel: 'all' // Override global setting
})
```

### Log Output Examples

**Success (logLevel: 'all'):**
```
🌐 [callApi] POST http://localhost:5020/api/invoices
  📤 Request: { method: 'POST', url: '...', query: {...}, body: {...} }
  ✅ Response [201] (245ms): { id: '123', status: 'paid', ... }
```

**Error (logLevel: 'errors' or 'all'):**
```
❌ [callApi] POST http://localhost:5020/api/invoices - 400
  🔴 Response [400] (123ms): {
    url: 'http://localhost:5020/api/invoices',
    method: 'POST',
    status: 400,
    response: { error: 'Client email already exists' }
  }
```

**Network Error (logLevel: 'errors' or 'all'):**
```
💥 [callApi] GET http://localhost:5020/api/users - NETWORK ERROR
  🔴 Fetch failed (5ms): {
    error: 'Failed to fetch',
    endpoint: '/users',
    url: 'http://localhost:5020/api/users'
  }
```

### Server-Side Logging

Set environment variable:

```bash
# In .env.local
CALL_API_LOG_LEVEL=all  # or 'errors' or 'none'
```

## Changelog

### v0.3.0 (2025-11-07)

- ✅ Added configurable logging system (`logLevel` option)
- ✅ Support for global logging via `localStorage.callApiLogLevel`
- ✅ Server-side logging via `CALL_API_LOG_LEVEL` env variable
- ✅ Beautiful log output with emojis and timing
- ✅ Grouped console logs for better readability

### v0.2.0 (2025-11-05)

- ✅ Added `parseApiError()` utility - **Fixes `[object Object]` display**
- ✅ Supports nested error objects (rate limit, validation, etc.)
- ✅ Always returns English error messages
- ✅ Comprehensive documentation with examples

### v0.1.0

- Initial release with `callApi()` function
