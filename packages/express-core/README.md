# @ezstart/express-core

Express.js infrastructure and utilities for @ezstart API services.

## Overview

`@ezstart/express-core` provides shared Express.js infrastructure, middleware, and utilities that ensure consistency and reduce code duplication across all API services in the @ezstart monorepo.

## Installation

This package is automatically included in all @ezstart APIs via workspace dependencies:

```json
{
  "dependencies": {
    "@ezstart/express-core": "workspace:*"
  }
}
```

## Quick Start

### Basic API Setup

```typescript
import { 
  createApp, 
  connectToMongo, 
  startServer, 
  getApiPort,
  Router 
} from '@ezstart/express-core'

const PORT = getApiPort('EZAUTH') // or 'EZ_BILLING', 'TOWER_DEFENSE'

// Create app with standard configuration (includes cors, json parsing, etc.)
const app = createApp()

// Setup routes using centralized Router
const router = Router()
router.get('/health', (_, res) => res.json({ status: 'ok' }))
app.use('/api', router)

// Connect to MongoDB and start server
connectToMongo('my-database')
  .then(() =>
    startServer(app, {
      routes: router,
      registries: [], // OpenAPI registries
      serviceName: 'MyService',
      port: PORT,
    })
  )
  .catch(err => {
    console.error('❌ Failed to start API', err)
    process.exit(1)
  })
```

### CRUD Controller Factory

```typescript
import { createCRUDController } from '@ezstart/express-core/controller-factory'
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
packages/express-core/src/
├── config/                # Configuration
│   └── ports.ts          # Centralized port configuration
├── controller-factory/    # Standard CRUD controller generators
│   ├── make-create-controller.ts
│   ├── make-delete-controller.ts
│   ├── make-get-by-id-controller.ts
│   ├── make-get-list-controller.ts
│   ├── make-restore-controller.ts
│   └── make-update-controller.ts
├── infra/                # Infrastructure utilities
│   ├── connectToMongo.ts # MongoDB connection
│   ├── createApp.ts      # Express app initialization (with cors)
│   ├── createSocketServer.ts # Socket.io server creation
│   ├── createTickerEngine.ts # Ticker engine for real-time updates
│   └── startServer.ts    # Server startup with OpenAPI docs
├── middlewares/          # Express middleware
│   ├── validate-params.ts # Params validation
│   └── validate-query.ts  # Query validation
├── openapi/             # OpenAPI/Swagger integration
│   ├── check-missing-descriptions.ts
│   ├── openapi-compatible.ts
│   ├── route-with-doc.ts # createRouterWithDoc utility
│   ├── strip-incompatible.ts
│   └── z-object-helper.ts
└── utils/              # Utility functions
    ├── find-with-query.ts # MongoDB query helper
    └── to-api-object.ts   # Convert Mongoose to plain object
```

## Core Features

### 🏗️ Infrastructure

#### App Bootstrap

```typescript
import { createApp } from '@ezstart/express-core'

// Creates Express app with built-in:
// - CORS enabled
// - JSON body parsing
// - URL-encoded parsing
// - dotenv config loaded
const app = createApp()
```

#### MongoDB Connection

```typescript
import { connectToMongo } from '@ezstart/express-core'

// Connects to MongoDB with standard URI format
await connectToMongo('database-name')
// Uses process.env.MONGO_URL || 'mongodb://localhost:27017/'
```

#### Server Startup with OpenAPI

```typescript
import { startServer } from '@ezstart/express-core'

startServer(app, {
  routes,           // Express router
  registries: [],   // OpenAPI registries array
  serviceName: 'MyAPI',
  port: 8001,
  onHttpServerReady: server => {
    // Optional: Setup Socket.io or other server extensions
  }
})
```

#### Port Configuration

```typescript
import { getApiPort, API_PORTS } from '@ezstart/express-core'

// Get standardized port for service
const PORT = getApiPort('EZAUTH')     // 8081
const PORT = getApiPort('EZ_BILLING') // 4101
const PORT = getApiPort('TOWER_DEFENSE') // 3101

// Falls back to process.env.PORT if defined
```

#### Express Router (Centralized)

```typescript
import { Router } from '@ezstart/express-core'

// Use centralized Router export instead of express.Router()
const router = Router()
router.get('/health', (req, res) => res.json({ status: 'ok' }))
```

### 🛡️ Middleware

#### Request Validation

```typescript
import { validateBody, validateParams, validateQuery } from '@ezstart/express-core/middlewares'
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
import { errorHandler } from '@ezstart/express-core/middlewares'

// Global error handler (use at the end)
app.use(errorHandler)
```

### 🏭 Controller Factory

#### Basic CRUD Controller

```typescript
import { createCRUDController } from '@ezstart/express-core/controller-factory'

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
import { setupSwagger } from '@ezstart/express-core/openapi'

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
import { registerSchema } from '@ezstart/express-core/openapi'
import { userSchema } from '@ezstart/types'

// Register Zod schemas for OpenAPI
registerSchema('User', userSchema)
registerSchema('CreateUser', createUserSchema)
```

### 🔧 Utilities

#### Standardized Responses

```typescript
import { success, error, paginated } from '@ezstart/express-core/utils'

// Success response
res.json(success(userData, 'User created'))

// Error response  
res.status(400).json(error('Invalid data', 'VALIDATION_ERROR'))

// Paginated response
res.json(paginated(users, { page: 1, total: 100 }))
```

#### Type-Safe Request Helpers

```typescript
import { TypedRequest } from '@ezstart/express-core/types'

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

- ✅ **ezauth/api** - Authentication service (port 8081)
- ✅ **ez-billing/api** - Billing management API (port 4101)  
- ✅ **tower-defense/api** - Tower Defense game API (port 3101)

### Standardized Features Across All APIs:

- ✅ **Centralized Express app creation** via `createApp()`
- ✅ **MongoDB connection** via `connectToMongo()`
- ✅ **Server startup with OpenAPI** via `startServer()`
- ✅ **Standardized port configuration** via `getApiPort()`
- ✅ **Centralized Router export** - no direct `express` imports
- ✅ **Built-in CORS** - configured in `createApp()`
- ✅ **Automatic dotenv loading** - no manual `dotenv.config()`
- ✅ **OpenAPI documentation** via `createRouterWithDoc()`
- ✅ **Request validation** via `validateParams()` and `validateQuery()`
- ✅ **Socket.io support** via `createSocketServer()` (tower-defense)

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
import { createApp, startServer, connectToMongoDB } from '@ezstart/express-core/infra'
import { validateBody, errorHandler } from '@ezstart/express-core/middlewares'
import { createCRUDController } from '@ezstart/express-core/controller-factory'
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
import { createApp, Router, getApiPort } from '@ezstart/express-core'

const app = createApp()
const router = Router()
const PORT = getApiPort('EZAUTH')
```

❌ **Don't:** Import directly from express or hardcode values
```typescript
import express from 'express' // Don't import express directly
import dotenv from 'dotenv'   // Don't load dotenv manually

const app = express()          // Manual setup
const router = express.Router() // Use centralized Router instead
const PORT = 8081              // Use getApiPort() instead
dotenv.config()                // Already done in createApp()
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