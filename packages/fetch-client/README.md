# @ezstart/fetch-client

Type-safe HTTP client for @ezstart monorepo with automatic API URL resolution and error parsing.

## Features

- ✅ Type-safe API calls with TypeScript generics
- ✅ Automatic URL resolution from `@ezstart/config`
- ✅ Automatic `/api` prefix normalization
- ✅ JSON body serialization
- ✅ Error parsing with `parseApiError()` - **NO MORE `[object Object]`** ✅
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

## Best Practices

### 1. Always use `parseApiError()` for error display

```typescript
// ✅ Good
const errorMessage = parseApiError(response.data)
toast.error(errorMessage)

// ❌ Bad
toast.error(response.data) // Shows [object Object]
```

### 2. Use TypeScript generics for type safety

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

### 3. Handle both success and error cases

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

## Changelog

### v0.2.0 (2025-11-05)

- ✅ Added `parseApiError()` utility - **Fixes `[object Object]` display**
- ✅ Supports nested error objects (rate limit, validation, etc.)
- ✅ Always returns English error messages
- ✅ Comprehensive documentation with examples

### v0.1.0

- Initial release with `callApi()` function
