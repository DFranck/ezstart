# @ezstart/types

Centralized TypeScript type definitions and validation schemas for the @ezstart monorepo.

## Overview

`@ezstart/types` provides shared TypeScript types, Zod validation schemas, and type utilities that ensure type safety and consistency across all applications and packages in the @ezstart monorepo.

## Installation

This package is automatically included in all @ezstart applications and packages:

```json
{
  "dependencies": {
    "@ezstart/types": "workspace:*"
  }
}
```

## Quick Start

### Basic Usage

```typescript
import { User, CreateUserSchema } from '@ezstart/types'
import { z } from 'zod'

// Type-safe user object
const user: User = {
  id: '123',
  email: 'user@example.com',
  createdAt: new Date()
}

// Validate user input
const userData = CreateUserSchema.parse({
  email: 'new-user@example.com',
  password: 'securePassword123'
})
```

### API Integration

```typescript
import { ApiResponse, PaginatedResponse } from '@ezstart/types/api'
import { User } from '@ezstart/types'

// Type-safe API responses
const response: ApiResponse<User[]> = {
  success: true,
  data: users,
  message: 'Users fetched successfully'
}

// Paginated data
const paginatedUsers: PaginatedResponse<User> = {
  items: users,
  pagination: {
    page: 1,
    limit: 10,
    total: 100,
    totalPages: 10
  }
}
```

## 📁 Package Structure

### Type Categories

```
packages/types/src/
├── api/                    # API-related types
│   ├── responses.ts        # Standard API response types
│   ├── pagination.ts       # Pagination types
│   └── errors.ts          # Error handling types
├── common/                # Common utility types
│   ├── base.ts            # Base entity types
│   ├── date.ts            # Date utility types
│   └── utility.ts         # Generic utility types
├── express/               # Express.js types
│   ├── request.ts         # Extended request types
│   └── response.ts        # Extended response types
└── validators/            # Zod validation schemas
    ├── user.ts            # User validation schemas
    ├── auth.ts            # Authentication schemas
    └── common.ts          # Common validation schemas
```

## 🔧 Type Categories

### API Types

#### Standard Response Types

```typescript
import { ApiResponse, ApiError } from '@ezstart/types/api'

// Success response
const successResponse: ApiResponse<User> = {
  success: true,
  data: user,
  message: 'User created successfully'
}

// Error response
const errorResponse: ApiError = {
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid email format',
    details: { field: 'email' }
  }
}
```

#### Pagination Types

```typescript
import { PaginationParams, PaginatedResponse } from '@ezstart/types/api'

// Pagination parameters
const params: PaginationParams = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
}

// Paginated response
const response: PaginatedResponse<User> = {
  items: users,
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    totalPages: 8,
    hasNext: true,
    hasPrev: false
  }
}
```

### Common Types

#### Base Entity Types

```typescript
import { BaseEntity, TimestampedEntity } from '@ezstart/types/common'

// All entities extend BaseEntity
interface User extends BaseEntity {
  email: string
  name: string
}

// Entities with timestamps
interface Post extends TimestampedEntity {
  title: string
  content: string
  authorId: string
}
```

#### Utility Types

```typescript
import { 
  OptionalExcept, 
  RequiredOnly, 
  DeepPartial,
  NonEmptyArray 
} from '@ezstart/types/common'

// Make all fields optional except specific ones
type CreateUser = OptionalExcept<User, 'email' | 'name'>

// Only specific fields required
type UpdateUser = RequiredOnly<User, 'id'>

// Deep partial for nested objects
type PartialConfig = DeepPartial<AppConfig>

// Array that must have at least one item
const tags: NonEmptyArray<string> = ['typescript', 'validation']
```

### Express Types

#### Extended Request Types

```typescript
import { AuthenticatedRequest, TypedRequest } from '@ezstart/types/express'

// Authenticated request with user
app.post('/protected', (req: AuthenticatedRequest, res) => {
  const userId = req.user.id // Type-safe user access
})

// Typed request body
interface CreatePostBody {
  title: string
  content: string
}

app.post('/posts', (req: TypedRequest<CreatePostBody>, res) => {
  const { title, content } = req.body // Fully typed
})
```

#### Response Helpers

```typescript
import { TypedResponse } from '@ezstart/types/express'

app.get('/users/:id', (req, res: TypedResponse<User>) => {
  res.json(user) // Type-safe response
})
```

## ✅ Validation Schemas

### Zod Schemas

#### User Validation

```typescript
import { 
  CreateUserSchema, 
  UpdateUserSchema, 
  UserLoginSchema 
} from '@ezstart/types/validators'

// Create user validation
const createUser = CreateUserSchema.parse({
  email: 'user@example.com',
  password: 'securePassword123',
  name: 'John Doe'
})

// Login validation
const loginData = UserLoginSchema.parse({
  email: 'user@example.com',
  password: 'password123'
})

// Update user validation
const updateData = UpdateUserSchema.parse({
  name: 'Jane Doe' // Only provided fields are validated
})
```

#### Authentication Schemas

```typescript
import { 
  RegisterSchema, 
  LoginSchema, 
  ResetPasswordSchema 
} from '@ezstart/types/validators'

// Registration
const registerData = RegisterSchema.parse({
  email: 'user@example.com',
  password: 'securePassword123',
  confirmPassword: 'securePassword123'
})

// Password reset
const resetData = ResetPasswordSchema.parse({
  token: 'reset-token-123',
  password: 'newSecurePassword123'
})
```

### Schema Composition

```typescript
import { BaseEntitySchema } from '@ezstart/types/validators'
import { z } from 'zod'

// Extend base schemas
const PostSchema = BaseEntitySchema.extend({
  title: z.string().min(1).max(100),
  content: z.string().min(10),
  authorId: z.string().uuid(),
  published: z.boolean().default(false)
})

type Post = z.infer<typeof PostSchema>
```

## 🏗️ OpenAPI Integration

### Zod to OpenAPI

```typescript
import { registry } from '@ezstart/types'
import { generateOpenApiDocument } from '@asteasolutions/zod-to-openapi'

// Schemas are automatically registered for OpenAPI
const openApiDocument = generateOpenApiDocument(registry, {
  openapi: '3.0.0',
  info: {
    title: 'EZStart API',
    version: '1.0.0'
  }
})
```

### API Documentation

```typescript
import { UserSchema, CreateUserSchema } from '@ezstart/types/validators'

// Schemas include OpenAPI metadata
UserSchema.openapi({
  example: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user@example.com',
    name: 'John Doe',
    createdAt: '2024-01-01T00:00:00.000Z'
  }
})
```

## 📊 Type Safety Examples

### End-to-End Type Safety

```typescript
// Frontend
import { CreateUserSchema, User } from '@ezstart/types'

const createUser = async (data: unknown): Promise<User> => {
  // Validate input
  const validatedData = CreateUserSchema.parse(data)
  
  // Type-safe API call
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(validatedData)
  })
  
  return response.json() // Returns typed User
}

// Backend
import { CreateUserSchema, User } from '@ezstart/types'
import { TypedRequest } from '@ezstart/types/express'

app.post('/api/users', (req: TypedRequest<z.infer<typeof CreateUserSchema>>, res) => {
  // Input already validated by middleware
  const userData = req.body // Fully typed
  
  // Type-safe database operation
  const user: User = await createUserInDb(userData)
  
  res.json(user) // Type-safe response
})
```

### Database Integration

```typescript
import { User } from '@ezstart/types'
import mongoose from 'mongoose'

// Mongoose schema with TypeScript types
const userSchema = new mongoose.Schema<User>({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

export const UserModel = mongoose.model<User>('User', userSchema)
```

## 🔄 Type Transformations

### Utility Transformations

```typescript
import { User } from '@ezstart/types'
import type { 
  PublicUser, 
  CreateUserInput,
  UpdateUserInput 
} from '@ezstart/types'

// Transform to public-safe user (omit sensitive fields)
const publicUser: PublicUser = {
  id: user.id,
  name: user.name,
  email: user.email
  // password and other sensitive fields omitted
}

// Input types for operations
const createInput: CreateUserInput = {
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe'
}

const updateInput: UpdateUserInput = {
  name: 'Jane Doe' // Only updatable fields
}
```

## 📦 Applications Using This Package

All @ezstart applications and packages use these shared types:

### ✅ Web Applications
- **ezauth/web** - Authentication types and schemas
- **ez-billing/web** - Billing and user types
- **ezstart/web** - All common types
- **fengshui/web** - User and analysis types
- **tower-defense/web** - Game and user types
- **asc-tcd/web** - Contact and service types

### ✅ API Services
- **ezauth/api** - Authentication and user management
- **ez-billing/api** - Billing and invoice types
- **tower-defense/api** - Game state and player types

### ✅ Packages
- **@ezstart/express-core** - Express types and validation
- **@ezstart/next-core** - React props and component types
- **@ezstart/ui** - Component props and theme types

## 🏭 Code Generation

### Automatic Type Generation

```typescript
// Types are automatically generated from Zod schemas
import { UserSchema } from '@ezstart/types/validators'
import { z } from 'zod'

// Infer TypeScript types from Zod schemas
type User = z.infer<typeof UserSchema>
type CreateUser = z.infer<typeof CreateUserSchema>
type UpdateUser = z.infer<typeof UpdateUserSchema>
```

### Mock Data Generation

```typescript
import { generateMock } from '@anatine/zod-mock'
import { UserSchema } from '@ezstart/types/validators'

// Generate mock data for testing
const mockUser = generateMock(UserSchema)
// Returns: { id: "uuid", email: "email@test.com", name: "Mock Name", ... }
```

## 🧪 Testing Integration

### Test Utilities

```typescript
import { UserSchema } from '@ezstart/types/validators'
import { generateMock } from '@anatine/zod-mock'

describe('User API', () => {
  test('should create user', async () => {
    const mockUserData = generateMock(CreateUserSchema)
    
    const response = await request(app)
      .post('/api/users')
      .send(mockUserData)
      .expect(201)
    
    // Response is typed
    const user: User = response.body
    expect(user.email).toBe(mockUserData.email)
  })
})
```

## 📋 Best Practices

### 1. Schema-First Development

✅ **Do:** Define Zod schemas first, then infer types
```typescript
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1)
})

type User = z.infer<typeof UserSchema>
```

❌ **Don't:** Define types separately from validation
```typescript
interface User {
  id: string
  email: string
  name: string
}

// Separate validation (can get out of sync)
const validateUser = (data: any) => { ... }
```

### 2. Consistent Naming

✅ **Do:** Use consistent naming patterns
```typescript
// Entity type
type User = z.infer<typeof UserSchema>

// Creation input (omit generated fields)
type CreateUser = z.infer<typeof CreateUserSchema>

// Update input (all fields optional)
type UpdateUser = z.infer<typeof UpdateUserSchema>
```

### 3. Modular Organization

✅ **Do:** Organize types by domain
```typescript
// User-related types
import { User, CreateUser } from '@ezstart/types/user'

// Auth-related types  
import { LoginRequest, AuthToken } from '@ezstart/types/auth'

// API types
import { ApiResponse } from '@ezstart/types/api'
```

## 🔧 Development

### Building Types

```bash
# Build TypeScript declarations
pnpm build

# Type check
pnpm typecheck

# Generate OpenAPI schemas
pnpm generate:openapi
```

### Adding New Types

1. **Create the Zod schema**
```typescript
// src/validators/post.ts
export const PostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  content: z.string(),
  authorId: z.string().uuid()
})
```

2. **Export the type**
```typescript
// src/post.ts
export type Post = z.infer<typeof PostSchema>
```

3. **Update package exports**
```typescript
// src/index.ts
export * from './post'
export * from './validators/post'
```

## Related Packages

- [`@ezstart/express-core`](../express-core/README.md) - Uses these types for API validation
- [`@ezstart/next-core`](../next-core/README.md) - Uses these types for React components
- [`@ezstart/ui`](../ui/README.md) - Uses these types for component props
- [`@ezstart/eslint-config`](../eslint-config/README.md) - TypeScript linting rules