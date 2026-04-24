# @ezstart/api-core

Unified Express-based API server framework — typed responses, Zod validation, OpenAPI-aware router, rate limiting, injected auth. Publishable on npm; works standalone in any project.

## Install

```bash
pnpm add @ezstart/api-core
# optional peer dependencies
pnpm add @ezstart/config @ezstart/logger    # @ezstart wrapper
pnpm add mongoose                           # only if you ship a MongoDB connector
pnpm add socket.io                          # only if you use createSocketServer
```

## Quickstart (monorepo)

The package ships a pre-configured wrapper wired to `@ezstart/config` (port + CORS) and `@ezstart/logger`.

```ts
import { Router } from 'express'
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { createEzstartServer, createDocRouter, sendSuccess, startServer } from '@ezstart/api-core'

const { app, config, logger } = createEzstartServer('myapp')

const registry = new OpenAPIRegistry()
const router = Router()
const docRouter = createDocRouter(registry, router, '/api/items')

docRouter.get('/', (_req, res) => sendSuccess(res, []), { summary: 'List items', tags: ['Items'] })

await startServer(app, {
  routes: router,
  registries: [registry],
  port: config.port,
  serviceName: config.serviceName,
  logger,
})
```

## Quickstart (external / standalone)

Build a fully agnostic server via the factory — no `@ezstart/*` imports required.

```ts
import { Router } from 'express'
import {
  createApiServer,
  createAuthMiddleware,
  sendError,
  sendSuccess,
  startServer,
  validateBody,
} from '@ezstart/api-core'
import { z } from 'zod'

const { app, logger } = createApiServer({
  port: 3000,
  serviceName: 'myapp',
  cors: { origins: ['https://myapp.example.com'] },
  rateLimit: { preset: 'standard' },
})

const { requireAuth } = createAuthMiddleware({
  verifyToken: async (token, _kind) => (token === 'good' ? { userId: 'u_1' } : null),
})

const router = Router()
router.post('/echo', requireAuth, validateBody(z.object({ msg: z.string() })), (req, res) => {
  sendSuccess(res, { echoed: req.validatedBody })
})

await startServer(app, { routes: router, port: 3000, logger })
```

## API

### `createApiServer(config): ApiServer`

Factory that returns `{ app, config, logger }`. Wires trust-proxy, CORS, JSON parser, health + root endpoints, and optional global rate limiting.

Key config: `port`, `serviceName`, `cookieAuthRoutes` (path prefixes for cookie-authenticated endpoints) + `cookieAuthAllowlist` (first-party origins for strict CORS), `rateLimit` (preset + options), `rawBodyRoutes`, `db`, `logger`. The legacy `cors` option is still honored for backcompat but is deprecated — see the "CORS policy" section below.

### `startServer(app, opts): Promise<http.Server>`

Bind the app to a port. Mounts `routes` at `basePath`, registers `/docs` (Swagger UI) when `registries` is provided, awaits `db.connect()` when a connector is supplied, and wires graceful-shutdown on `SIGINT` / `SIGTERM`.

### Response helpers — `sendSuccess` / `sendError` / `sendValidationError`

Emit the envelope shapes defined by `@ezstart/api-contracts`:

- `sendSuccess(res, data, meta?)` → `{ success: true, data, meta? }`
- `sendError(res, message, status, { code?, details?, retryAfter? })` → `{ success: false, error }`
- `sendValidationError(res, zodError)` → 422 with structured `details[]`

### Middlewares

- `createRateLimiter(opts)` (plus `createStrictRateLimiter`, `createVeryStrictRateLimiter`, `createModerateRateLimiter`)
- `createPermissiveCorsMiddleware(opts?)` — Tier 1/2 CORS (`ACAO: *`, `credentials: false`). Applied globally by `createApiServer` unless the legacy `cors` option is passed.
- `createStrictCorsMiddleware({ allowlist, ... })` — Tier 3 CORS for cookie-authenticated routes. Reflects the origin only when it matches the allowlist (exact string or regex) and sets `credentials: true`.
- `createCorsMiddleware(config)` — **deprecated** wrapper around the `cors` package. Use the permissive/strict factories instead.
- `createAuthMiddleware({ verifyToken, cookieName? })` — returns `{ requireAuth, optionalAuth }`. The verifier is fully injected (JWT, PASETO, opaque session — all equivalent). Hydrates `req.userId` and `req.user`.
- `validateBody(schema)` / `validateQuery(schema)` / `validateParams(schema)` — Zod validators that populate `req.validatedBody` / `req.validatedQuery` / `req.validatedParams`.

### CORS policy (3-tier)

`createApiServer` (and `createEzstartServer`) implement a 3-tier CORS model aligned with Stripe / Clerk / Supabase. See `.claude/rules/standard-saas-cors.md` for the full rationale.

| Tier         | Auth mode                                           | Example endpoints                                       | CORS                                                              |
| ------------ | --------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| **1** Public | Publishable key (`?key=ez_pk_*`) or none            | `GET /api/keys/config`, `GET /api/plans`, `GET /health` | `ACAO: *`, `credentials: false`                                   |
| **2** Bearer | `Authorization: Bearer <JWT>`                       | `POST /api/donations`, `GET /api/users/me`              | `ACAO: *`, `credentials: false`                                   |
| **3** Cookie | `Cookie: session=<httpOnly>` (auto-sent by browser) | `POST /api/auth/login`, `POST /api/auth/refresh`        | `ACAO: <reflected origin>`, `credentials: true`, strict allowlist |

Opt-in strict CORS per route prefix via `cookieAuthRoutes` + `cookieAuthAllowlist`:

```ts
createEzstartServer('ezauth', {
  cookieAuthRoutes: ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'],
  cookieAuthAllowlist: [
    'https://ezauth.ezstart.xyz',
    /^https:\/\/ezauth-[a-z0-9]+-ezstart\.vercel\.app$/,
    'http://localhost:6111',
  ],
})
```

All other paths (Tier 1/2) automatically receive permissive CORS — external consumers can call them from any origin without registering their domain, as expected for a SaaS API.

### `createDocRouter(registry, router, basePath?): DocRouter`

Build an Express router that dual-writes to an `OpenAPIRegistry`. When `basePath` is non-empty, a dedicated sub-router is mounted under it so the Express route and the documented OpenAPI path stay in sync.

```ts
docRouter.post('/', validateBody(CreateItemSchema), createItemHandler, {
  summary: 'Create item',
  tags: ['Items'],
  bodySchema: CreateItemSchema,
  responseSchema: ItemSchema,
  status: 201,
})
```

### `DbConnector` interface

```ts
interface DbConnector<TModels = unknown> {
  connect(): Promise<void>
  disconnect(): Promise<void>
  readonly models: TModels
  readonly isConnected: boolean
}
```

Inject your own implementation (MongoDB, Postgres, Redis, ...). `startServer` awaits `connector.connect()` before listening and calls `connector.disconnect()` on shutdown.

### `createSocketServer(httpServer, config)`

Optional Socket.IO helper. The `socket.io` package is loaded via dynamic `import()` so consumers who don't use realtime never pay the bundle cost.

### `createEzstartServer(appName, opts?): ApiServer`

Monorepo wrapper. Uses `@ezstart/config` (`getPort(appName, 'api')`, `getAllowedOrigins(appName)`) and `@ezstart/logger` by default. Supports the same overrides as `createApiServer`.

## Migration from `@ezstart/express-core`

| Before (`@ezstart/express-core`)                    | After (`@ezstart/api-core`)                                                |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| `createApp({ apiApp: 'myapp' })`                    | `createEzstartServer('myapp').app`                                         |
| `createRateLimiter()` (+ `createStrictRateLimiter`) | Same names, re-exported                                                    |
| `createAuthMiddleware(jwtSecret)`                   | `createAuthMiddleware({ verifyToken })` — inject any verifier              |
| `createRouterWithDoc(registry, router, basePath)`   | `createDocRouter(registry, router, basePath)`                              |
| `sendError(res, 'msg', 500, 'CODE')` (flat string)  | `sendError(res, 'msg', 500, { code: 'CODE' })` — structured `ErrorPayload` |
| `startServer(app, { port, routes, registries })`    | Same shape, now `async` + supports `db`, `onReady`, `onShutdown`           |
| `connectToMongo('db')`                              | Inject your own `DbConnector` — core stays agnostic                        |

See `apps/*/api/src/index.ts` during the migration window for per-app patches.

## Rules

- Never use raw `res.json()` for API responses — always go through `sendSuccess` / `sendError` / `sendValidationError` so the client SDK can discriminate envelopes.
- Never hard-code `Authorization` parsing — use `createAuthMiddleware` with a verifier.
- Logger is silent by default in the agnostic core; opt-in by passing your own logger (`@ezstart/logger`, `pino`, `winston`, ...).

## Related

- [.claude/rules/standard.md](../../.claude/rules/standard.md) — the standard this package follows
- [@ezstart/api-contracts](../api-contracts/README.md) — wire shapes consumed by this server
- [@ezstart/api-sdk](../api-sdk/README.md) — matching client SDK
- `@ezstart/express-core` — legacy package this one replaced (deleted)
