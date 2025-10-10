# @ezstart/types

Shared TypeScript types and Zod schemas with OpenAPI support for all @ezstart APIs.

## Overview

This package provides a centralized collection of reusable TypeScript types and Zod validation schemas that are truly shared across multiple APIs in the monorepo. It includes OpenAPI extensions for automatic API documentation generation.

## Features

- 🔧 **Extended Zod** - Zod with OpenAPI metadata support
- 📝 **Common Schemas** - MongoDB ObjectId, pagination, filtering
- 🎯 **Type Safety** - Full TypeScript inference
- 📚 **OpenAPI Ready** - Automatic API documentation
- ♻️ **DRY Principle** - Single source of truth for shared types

## Installation

This package is already installed in the monorepo. Add it to your API dependencies:

```json
{
  "dependencies": {
    "@ezstart/types": "workspace:*"
  }
}
```

## Usage

### Extended Zod with OpenAPI

```typescript
import { z } from '@ezstart/types'

// Schemas automatically support OpenAPI metadata
const userSchema = z.object({
  name: z.string().describe('User full name'),
  email: z.string().email().describe('User email address'),
  age: z.number().min(18).describe('User age (minimum 18)')
})

// Type inference works as usual
type User = z.infer<typeof userSchema>
```

### MongoDB ObjectId Schema

```typescript
import { z, mongoIdSchema } from '@ezstart/types'

// Validate MongoDB ObjectIds
const paramsSchema = z.object({
  id: mongoIdSchema // Validates 24-char hex string
})

// Usage in API
app.get('/api/users/:id', (req, res) => {
  const { id } = paramsSchema.parse(req.params)
  // id is validated as MongoDB ObjectId
})
```

### Listing/Pagination Query Schema

```typescript
import { listingQuerySchema, ListingQuery } from '@ezstart/types'

// Built-in pagination, filtering, and soft-delete support
app.get('/api/items', (req, res) => {
  const query: ListingQuery = listingQuerySchema.parse(req.query)

  // query.page - default: 1
  // query.limit - default: 20, max: 100
  // query.includeDeleted - default: false
  // query.deletedOnly - default: false
  // query.from - optional ISO date filter
  // query.to - optional ISO date filter

  const items = await getItems(query)
  res.json(items)
})
```

## Available Schemas

### mongoIdSchema

Validates MongoDB ObjectId (24-character hexadecimal string).

```typescript
const mongoIdSchema: z.ZodString
// Validates: /^[a-f\d]{24}$/i
```

### listingQuerySchema

Standard pagination and filtering for list endpoints.

```typescript
const listingQuerySchema: z.ZodObject<{
  page: number        // default: 1, min: 1
  limit: number       // default: 20, min: 1, max: 100
  includeDeleted: boolean  // default: false
  deletedOnly: boolean     // default: false
  from: string | undefined // ISO 8601 date
  to: string | undefined   // ISO 8601 date
}>
```

### Type Exports

```typescript
// Zod type inference helpers
export type { Infer, Input } from 'zod'

// ListingQuery type
export type ListingQuery = z.infer<typeof listingQuerySchema>
```

## API Reference

### z

Extended Zod instance with OpenAPI support. Use it exactly like regular Zod, but with automatic OpenAPI metadata.

```typescript
import { z } from '@ezstart/types'

const schema = z.object({
  field: z.string().describe('Field description for OpenAPI')
})
```

### mongoIdSchema

Pre-configured schema for MongoDB ObjectIds.

**Validation:**
- String type
- Exactly 24 characters
- Hexadecimal (a-f, 0-9)
- Case insensitive

**Example:**
```typescript
const validId = '507f1f77bcf86cd799439011' // ✅
const invalidId = 'not-an-objectid'        // ❌
```

### listingQuerySchema

Complete query schema for paginated list endpoints.

**Features:**
- Automatic type coercion (string → number/boolean)
- Pagination (page, limit)
- Soft-delete filtering
- Date range filtering
- OpenAPI documentation ready

## Applications Using This Package

**APIs:**
- ✅ **api-ezauth** - Authentication service
- ✅ **api-ezbill** - Invoicing API
- ✅ **api-ezpay** - Payment API
- ✅ **api-tower-defense** - Game backend
- ✅ **api-green-pulse** - Eco-tracking API

**Shared Packages:**
- ✅ **@ezstart/express-core** - API infrastructure
- ✅ **@ezbill/types** - Extends with billing-specific types
- ✅ **@tower-defense/types** - Extends with game-specific types
- ✅ **@green-pulse/types** - Extends with eco-specific types

## Related Packages

- [@ezstart/express-core](../express-core) - Express API infrastructure
- [@asteasolutions/zod-to-openapi](https://www.npmjs.com/package/@asteasolutions/zod-to-openapi) - OpenAPI generator
- [zod](https://zod.dev) - TypeScript-first schema validation

## Best Practices

### ✅ DO: Add truly shared types here

```typescript
// Types used by 3+ APIs
export const emailSchema = z.string().email()
export const paginationSchema = z.object({ ... })
```

### ❌ DON'T: Add app-specific types

```typescript
// Belongs in @ezbill/types
export const invoiceSchema = z.object({ ... })

// Belongs in @tower-defense/types
export const towerSchema = z.object({ ... })
```

### Hierarchy Rule

1. **@ezstart/types** - Truly universal (3+ apps)
2. **@{app}/types** - App-specific but shared between API/Web
3. **app/api/types** - API-only types
4. **app/web/types** - Web-only types

## Technical Details

- Built on Zod v3.23.8
- Uses @asteasolutions/zod-to-openapi v7.3.4
- Compiled to ES modules
- Full TypeScript support
- Zero runtime overhead (types only)

## Example: Complete API Integration

```typescript
import { z, mongoIdSchema, listingQuerySchema } from '@ezstart/types'
import { Router } from '@ezstart/express-core'

const router = Router()

// Get item by ID
router.get('/items/:id', async (req, res) => {
  const { id } = z.object({ id: mongoIdSchema }).parse(req.params)
  const item = await Item.findById(id)
  res.json(item)
})

// List items with pagination
router.get('/items', async (req, res) => {
  const query = listingQuerySchema.parse(req.query)
  const items = await Item.find()
    .skip((query.page - 1) * query.limit)
    .limit(query.limit)
  res.json(items)
})

export default router
```

## License

MIT © EZStart
