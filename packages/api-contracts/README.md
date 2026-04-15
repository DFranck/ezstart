# @ezstart/api-contracts

Wire contracts (TypeScript types + Zod schemas) shared between `@ezstart/api-sdk` (client) and the future `@ezstart/api-core` (server framework).

## Install

```bash
pnpm add @ezstart/api-contracts zod
```

`zod` is a peer dependency (`^3.23.0`) so consumers stay on a single Zod instance.

## Quickstart

### Client — discriminate the response envelope

```ts
import { isSuccessResponse, type ApiResponse } from '@ezstart/api-contracts'

const body: ApiResponse<{ id: string; email: string }> = await fetchJson('/api/me')

if (isSuccessResponse(body)) {
  body.data.email // → string (fully typed)
} else {
  body.error // → ErrorPayload | string (narrow at use-site)
}
```

### Server — validate pagination query

```ts
import { PaginationQuerySchema } from '@ezstart/api-contracts'

app.get('/api/users', (req, res) => {
  const { limit, offset } = PaginationQuerySchema.parse(req.query)
  // limit: 1..100 (default 20), offset: >= 0 (default 0)
})
```

### Shared — standardized error codes

```ts
import { ErrorCode } from '@ezstart/api-contracts'

if (err.code === ErrorCode.RATE_LIMIT_EXCEEDED) {
  await sleep(err.retryAfter ?? 60)
}
```

### Auth — Zod schemas shared by client and server

```ts
import { LoginRequestSchema, type LoginRequest } from '@ezstart/api-contracts'

// server
const parsed = LoginRequestSchema.safeParse(req.body)
if (!parsed.success) return res.status(400).json({ issues: parsed.error.issues })

// client
const body: LoginRequest = { email, password, app: 'myapp' }
```

## API

### Envelope (`envelope.ts`)

| Export               | Kind  | Purpose                                             |
| -------------------- | ----- | --------------------------------------------------- |
| `SuccessResponse<T>` | type  | `{ success: true, data: T, meta?: ApiMeta }`        |
| `ErrorResponse`      | type  | `{ success: false, error: ErrorPayload \| string }` |
| `ErrorPayload`       | type  | `{ message, code?, details?, retryAfter? }`         |
| `ApiResponse<T>`     | type  | Union `SuccessResponse<T> \| ErrorResponse`         |
| `isSuccessResponse`  | guard | Narrows `unknown` → `SuccessResponse<T>`            |
| `isErrorResponse`    | guard | Narrows `unknown` → `ErrorResponse`                 |

### Pagination (`pagination.ts`)

| Export                  | Kind | Purpose                                              |
| ----------------------- | ---- | ---------------------------------------------------- |
| `ApiMeta`               | type | Permissive meta (indexable)                          |
| `PaginationMeta`        | type | `{ total, limit, offset }` (all numbers)             |
| `PaginatedResponse<T>`  | type | `{ data: T[], meta: PaginationMeta }`                |
| `PaginationQuerySchema` | Zod  | Validates GET list querystring (default 20, max 100) |
| `PaginationQuery`       | type | `z.infer<typeof PaginationQuerySchema>`              |

### Errors (`errors.ts`)

`ErrorCode` — frozen object + matching union type. Codes:

- Auth: `UNAUTHORIZED`, `INVALID_TOKEN`, `INVALID_OR_EXPIRED_TOKEN`, `EMAIL_NOT_VERIFIED`, `TWO_FACTOR_REQUIRED`
- AuthZ: `FORBIDDEN`
- Validation: `VALIDATION_ERROR`
- Resources: `NOT_FOUND`, `ALREADY_EXISTS`, `CONFLICT`
- Rate limit: `RATE_LIMIT_EXCEEDED`
- Server/network: `NETWORK_ERROR`, `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`

NEVER rename or remove an existing code without a major version bump.

### Auth (`auth.ts`)

Zod schemas + inferred types for the core auth endpoints:

- `LoginRequest` / `LoginResponse` (union of `LoginAuthCodeResponse` and `LoginTwoFactorPendingResponse`)
- `RegisterRequest` / `RegisterResponse`
- `QuickSignupRequest`
- `ForgotPasswordRequest`
- `ResetPasswordRequest`
- `VerifyEmailRequest`
- `SendVerificationRequest`
- `RefreshRequest` / `RefreshResponse`
- `TokenRequest` / `TokenResponse` (auth code → access token exchange)
- `VerifyRequest` / `VerifyResponse`
- `AuthUser` (public user shape, never contains secrets)
- `SupportedLocale` (`'en' | 'fr' | 'vi'`)
- `EmailOverride` (optional per-send template overrides)

More specialized flows (2FA enrollment, session listing, SSO authorize/exchange) are intentionally omitted from this first cut — they can be added without breaking these contracts.

## Migration

This is a **new** package — no prior version to migrate from. Consumers that previously defined envelope / pagination / error shapes locally can adopt `@ezstart/api-contracts` additively: re-export the canonical types from here and delete the local duplicates when ready. Adoption is per-scope (envelope OR pagination OR errors OR auth), nothing is all-or-nothing.

## Adoption

This package is consumed by:

- `@ezstart/api-sdk` — client-side (envelope parsing, error codes)
- `@ezstart/api-core` — server-side (helpers honor the same shapes)

Adopting it in any project (internal or external) guarantees wire compatibility with both ends, even without the `@ezstart` SDKs.

## Related

- [standard.md](../../.claude/rules/standard.md) — how this package is built
- [@ezstart/api-sdk](../api-sdk/README.md) — HTTP client that consumes these contracts
- [Zod](https://zod.dev) — schema validation runtime
