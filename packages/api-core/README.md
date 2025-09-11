# @ezstart/api-core

Centralized API infrastructure and utilities for all @ezstart backend services.

## Overview

`@ezstart/api-core` provides shared infrastructure, middleware, and utilities that ensure consistency and reduce code duplication across all API services in the @ezstart monorepo.

## Installation

This package is automatically included in all @ezstart APIs via workspace dependencies:

```json
{
  "dependencies": {
    "@ezstart/api-core": "workspace:*"
  }
}
```

## Quick Start

### Basic API Setup

```typescript
import { createApp, startServer } from '@ezstart/api-core/infra'
import { validateBody, validateParams } from '@ezstart/api-core/middlewares'
import { userSchema } from '@ezstart/types'

const app = createApp({
  name: 'my-api',
  version: '1.0.0'
})

// Use validation middleware
app.post('/users', 
  validateBody(userSchema),
  (req, res) => {
    const userData = req.body // Typed and validated
    res.json({ success: true })
  }
)

startServer(app, { port: 8001 })
```

### CRUD Controller Factory

```typescript
import { createCRUDController } from '@ezstart/api-core/controller-factory'
import { userSchema } from '@ezstart/types'
import { User } from '../models/User'

const userController = createCRUDController({
  model: User,
  schema: userSchema,
  basePath: '/users'
})

app.use('/api', userController.router)
```

## Architecture

### 📁 Package Structure

```
packages/api-core/src/
├── controller-factory/     # Standard CRUD controller generators
│   ├── create-controller.ts
│   ├── crud-operations.ts
│   └── types.ts
├── infra/                 # Infrastructure utilities
│   ├── app-bootstrap.ts   # Express app initialization
│   ├── mongodb.ts         # MongoDB connection utilities
│   └── server.ts          # Server startup utilities
├── middlewares/           # Express middleware
│   ├── validation.ts      # Request validation (body, params, query)
│   ├── error-handler.ts   # Global error handling
│   └── cors.ts           # CORS configuration
├── openapi/              # OpenAPI/Swagger integration
│   ├── schema-generator.ts
│   └── swagger-setup.ts
├── types/                # Type definitions
│   ├── express.d.ts      # Extended Express types
│   └── api.ts           # Common API types
└── utils/               # Utility functions
    ├── response.ts      # Standardized API responses
    └── validation.ts    # Validation helpers
```

## Core Features

### 🏗️ Infrastructure

#### App Bootstrap

```typescript
import { createApp } from '@ezstart/api-core/infra'

const app = createApp({
  name: 'ezauth-api',
  version: '1.0.0',
  cors: true,
  swagger: {
    enabled: true,
    path: '/docs'
  }
})
```

#### MongoDB Connection

```typescript
import { connectToMongoDB } from '@ezstart/api-core/infra'

await connectToMongoDB({
  uri: process.env.MONGODB_URI,
  dbName: 'ezstart'
})
```

#### Server Startup

```typescript
import { startServer } from '@ezstart/api-core/infra'

startServer(app, {
  port: 8001,
  name: 'EZAuth API'
})
```

### 🛡️ Middleware

#### Request Validation

```typescript
import { validateBody, validateParams, validateQuery } from '@ezstart/api-core/middlewares'
import { createUserSchema, userIdSchema } from '@ezstart/types'

// Body validation
app.post('/users', 
  validateBody(createUserSchema),
  handler
)

// Params validation  
app.get('/users/:id',
  validateParams(userIdSchema),
  handler
)

// Query validation
app.get('/users',
  validateQuery(userQuerySchema),
  handler
)
```

#### Error Handling

```typescript
import { errorHandler } from '@ezstart/api-core/middlewares'

// Global error handler (use at the end)
app.use(errorHandler)
```

### 🏭 Controller Factory

#### Basic CRUD Controller

```typescript
import { createCRUDController } from '@ezstart/api-core/controller-factory'

const userController = createCRUDController({
  model: UserModel,
  schema: {
    create: createUserSchema,
    update: updateUserSchema,
    params: userParamsSchema
  },
  basePath: '/users'
})

// Provides: GET, POST, PUT, DELETE endpoints
app.use('/api', userController.router)
```

#### Custom Controller Extensions

```typescript
const userController = createCRUDController({
  model: UserModel,
  schema: userSchemas,
  basePath: '/users',
  extensions: {
    // Add custom endpoints
    'GET /profile': async (req, res) => {
      const user = await UserModel.findById(req.user.id)
      res.json(user)
    },
    'POST /reset-password': [
      validateBody(resetPasswordSchema),
      async (req, res) => {
        // Custom logic
      }
    ]
  }
})
```

### 📊 OpenAPI/Swagger

#### Automatic Documentation

```typescript
import { setupSwagger } from '@ezstart/api-core/openapi'

const app = createApp({ name: 'My API' })

setupSwagger(app, {
  title: 'My API',
  version: '1.0.0',
  description: 'API documentation',
  path: '/docs'
})
```

#### Schema Integration

```typescript
import { registerSchema } from '@ezstart/api-core/openapi'
import { userSchema } from '@ezstart/types'

// Register Zod schemas for OpenAPI
registerSchema('User', userSchema)
registerSchema('CreateUser', createUserSchema)
```

### 🔧 Utilities

#### Standardized Responses

```typescript
import { success, error, paginated } from '@ezstart/api-core/utils'

// Success response
res.json(success(userData, 'User created'))

// Error response  
res.status(400).json(error('Invalid data', 'VALIDATION_ERROR'))

// Paginated response
res.json(paginated(users, { page: 1, total: 100 }))
```

#### Type-Safe Request Helpers

```typescript
import { TypedRequest } from '@ezstart/api-core/types'

interface CreateUserBody {
  email: string
  password: string
}

app.post('/users', (req: TypedRequest<CreateUserBody>, res) => {
  const { email, password } = req.body // Fully typed
})
```

## APIs Using This Package

All @ezstart APIs use this shared infrastructure:

- ✅ **ezauth/api** - Authentication service (port 8001)
- ✅ **ez-billing/api** - Billing management API (port 4101)  
- ✅ **tower-defense/api** - Tower Defense game API (port 3101)

## Configuration

### Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/ezstart
DB_NAME=ezstart

# Server
PORT=8001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000

# Swagger
SWAGGER_ENABLED=true
SWAGGER_PATH=/docs
```

### TypeScript Configuration

Each API should use the centralized TypeScript configuration:

```json
{
  "extends": "@ezstart/typescript-config/api.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

## Integration Examples

### Complete API Example

```typescript
// src/index.ts
import { createApp, startServer, connectToMongoDB } from '@ezstart/api-core/infra'
import { validateBody, errorHandler } from '@ezstart/api-core/middlewares'
import { createCRUDController } from '@ezstart/api-core/controller-factory'
import { userSchema } from '@ezstart/types'
import { User } from './models/User'

async function bootstrap() {
  // Connect to database
  await connectToMongoDB({
    uri: process.env.MONGODB_URI!,
    dbName: 'my-app'
  })

  // Create app
  const app = createApp({
    name: 'my-api',
    version: '1.0.0'
  })

  // Add CRUD routes
  const userController = createCRUDController({
    model: User,
    schema: userSchema,
    basePath: '/users'
  })
  
  app.use('/api', userController.router)

  // Custom routes
  app.get('/health', (req, res) => {
    res.json({ status: 'OK' })
  })

  // Error handling
  app.use(errorHandler)

  // Start server
  startServer(app, { port: 8001 })
}

bootstrap().catch(console.error)
```

### Model Integration

```typescript
// models/User.ts
import mongoose from 'mongoose'
import { UserType } from '@ezstart/types'

const userSchema = new mongoose.Schema<UserType>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

export const User = mongoose.model<UserType>('User', userSchema)
```

## Best Practices

### 1. Use Centralized Infrastructure

✅ **Do:** Use the provided infrastructure utilities
```typescript
const app = createApp({ name: 'my-api' })
```

❌ **Don't:** Create Express apps manually
```typescript
const app = express() // Manual setup
```

### 2. Validate All Inputs

✅ **Do:** Use validation middleware
```typescript
app.post('/users', validateBody(userSchema), handler)
```

❌ **Don't:** Skip validation
```typescript
app.post('/users', handler) // No validation
```

### 3. Leverage Controller Factory

✅ **Do:** Use CRUD controller factory for standard operations
```typescript
const controller = createCRUDController({ model, schema })
```

❌ **Don't:** Write repetitive CRUD code
```typescript
app.get('/users', async (req, res) => { /* manual CRUD */ })
```

### 4. Consistent Error Handling

✅ **Do:** Use global error handler
```typescript
app.use(errorHandler)
```

❌ **Don't:** Handle errors inconsistently
```typescript
// Inconsistent error responses across routes
```

## Development

```bash
# Build package
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck
```

## Related Packages

- [`@ezstart/types`](../types/README.md) - Shared TypeScript types
- [`@ezstart/typescript-config`](../typescript-config/README.md) - TypeScript configuration
- [`@ezstart/eslint-config`](../eslint-config/README.md) - ESLint configuration
- [EZAuth API](../../apps/ezauth/api/README.md) - Example API using this package