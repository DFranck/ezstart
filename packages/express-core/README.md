# @ezstart/express-core

> **DEPRECATED.** New code should import from **[@ezstart/api-core](../api-core/)** — the agnostic, publishable replacement.
>
> This package is kept as a transitional dependency for app code that has not yet been migrated (route files, models, middleware factories, controller-factory, mongoose query helpers, zod/OpenAPI helpers). The six API boot files (`apps/*/api/src/index.ts`) have already been migrated to `createEzstartServer` from `@ezstart/api-core`.
>
> Do not build new features on top of this package. Extend `@ezstart/api-core` instead, and update consumers incrementally.

Express.js infrastructure package for all @ezstart API services.

## Purpose

Provides a standardized Express app factory with auto-configured CORS, MongoDB connection management, rate limiting, OpenAPI/Swagger docs, auth middleware, and error handling.

## Tech Stack

- Express.js, Mongoose, Zod OpenAPI, Swagger UI
- Rate limiting (express-rate-limit), helmet, compression

## Architecture

```
express-core/src/
├── infra/             # createApp, startServer, connectToMongo
├── middleware/        # Auth verification, error handling
├── middlewares/       # Rate limiting (standard, strict, very strict)
├── controller-factory/# Generic CRUD controller generator
├── openapi/           # OpenAPI registry and Swagger UI setup
├── config/            # Internal config
├── helpers/           # Utility functions
└── types/             # Shared types
```

## Usage

```typescript
import {
  createApp,
  connectToMongo,
  startServer,
  getApiPort,
  createRateLimiter,
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
} from '@ezstart/express-core'

const app = createApp({ apiApp: 'myapp' }) // CORS auto-configured
app.use(createRateLimiter()) // Rate limiting

connectToMongo('mydb').then(() =>
  startServer(app, { serviceName: 'MyApp', port: getApiPort('myapp') })
)
```

## Used By

All API services: ezauth, ezbill, ezpay, ezstart, gacha-analyzer, green-pulse.

## Related

- [@ezstart/config](../config) — URLs, ports, CORS origins
- [MONGODB-ARCHITECTURE.md](./MONGODB-ARCHITECTURE.md) — MongoDB patterns
