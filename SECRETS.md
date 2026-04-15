# Secrets & Environment Variables

**Architecture: root-only, GENERIC (no app prefix).** One file per environment
lives at the monorepo root and holds every secret for every app. Per-app
values are either **templated** (`MONGO_URL` with `{app}`/`{env}`
placeholders) or **suffixed** (`SENTRY_DSN_EZAUTH`) — never prefixed.

Source of truth at runtime:

- `@ezstart/config/server` → `loadSharedEnv({ app, layer })` — used by APIs via
  `createApp({ apiApp })` / `instrument.mts`
- `@ezstart/next-config/withSharedEnv` — used by Next.js apps
- `@ezstart/config/env-resolvers` → `getMongoUrl(app)`, `getJwtSecret()`,
  `getSentryDsn(app)` — helpers that resolve generic root vars to per-app
  values at the call site

## Layout

```
@ezstart/
├── .env.example         # Template (committed) — documents every var, no values
├── .env.local           # DEV secrets for ALL apps (gitignored)
├── .env.staging         # STAGING reference/runtime (gitignored)
├── .env.production      # PROD reference (gitignored; Railway/Vercel is source of truth)
│
└── apps/{app}/{api|web}/
    └── .env.example     # Doc-only stub (committed) — lists what the app reads
                         # from root. No secrets, no app-local .env.* files.
```

**No more app-local `.env.local` / `.env.production` files.** They were
removed during the 2026-04 generic-env migration. Only
`apps/ezauth/api/.env.test` survives (vitest loads it directly).

## Environment selection

The loader picks the right file based on `DEPLOY_ENV` and `NODE_ENV`:

| `DEPLOY_ENV` | `NODE_ENV`   | File loaded       |
| ------------ | ------------ | ----------------- |
| `production` | any          | `.env.production` |
| `staging`    | any          | `.env.staging`    |
| `local`      | any          | `.env.local`      |
| _(unset)_    | `production` | `.env.production` |
| _(unset)_    | _other_      | `.env.local`      |

Railway + Vercel set `DEPLOY_ENV=staging` / `production` explicitly on each
service so ambiguity is impossible.

## Generic naming conventions

Root env keys use GENERIC names — no `EZAUTH_` / `EZBILL_` / etc. prefixes.
Two conventions let per-app values live at the root without collisions:

1. **Templating** — when the difference between apps is a simple substitution:

   ```bash
   MONGO_URL=mongodb+srv://.../{app}-{env}?retryWrites=true&w=majority
   ```

   App code calls `getMongoUrl('ezbill')` → `mongodb+srv://.../ezbill-dev?...`
   in local, `.../ezbill-staging?...` in staging, `.../ezbill-prod?...` in
   production.

2. **Suffixing** — when the value is genuinely unique per app (Sentry DSNs,
   which identify distinct Sentry projects):

   ```bash
   SENTRY_DSN_EZAUTH=https://...@sentry.io/111
   SENTRY_DSN_EZBILL=https://...@sentry.io/222
   SENTRY_DSN_GREEN_PULSE=https://...@sentry.io/333
   ```

   App code calls `getSentryDsn('ezauth')`. Kebab-case app names
   (`green-pulse`) are converted to `GREEN_PULSE` for the suffix.

3. **Shared by design** — values that MUST be identical across every app
   (`JWT_SECRET` for SSO interop) live at the root as-is and are read via
   `getJwtSecret()`.

4. **Single-consumer** — values that happen to be consumed by only one app
   (`STRIPE_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `EXCHANGE_RATE_API_KEY`, ESG
   integration keys) also live at the root with their plain names. No prefix
   is needed because there's no ambiguity.

5. **`NEXT_PUBLIC_*`** — Next.js convention, readable from the client bundle.
   Never prefix these.

## Helpers (`@ezstart/config/env-resolvers`)

```ts
import { getMongoUrl, getJwtSecret, getSentryDsn } from '@ezstart/config/env-resolvers'

// In apps/{app}/api/src/instrument.mts, BEFORE any other import:
loadSharedEnv({ app: 'ezauth', layer: 'api' })
process.env.MONGO_URL = getMongoUrl('ezauth')
const dsn = getSentryDsn('ezauth')
if (dsn) process.env.SENTRY_DSN = dsn

// Everywhere else, read process.env.MONGO_URL / process.env.JWT_SECRET directly —
// they're already populated by the time business code runs.
```

To add a new helper (e.g. a templated URL for a new shared service), extend
`packages/config/src/env-resolvers.ts` with a focused function and unit tests
in `packages/config/src/__tests__/env-resolvers.test.ts`.

## Required env manifest

`packages/config/src/env-manifests.ts` declares required vars per API:

```ts
export const SHARED_REQUIRED = ['JWT_SECRET', 'MONGO_URL']

export const ENV_MANIFESTS = {
  ezauth: { required: ['OAUTH_STATE_SECRET'] },
  ezbill: { required: [] },
  ezpay: { required: ['STRIPE_SECRET_KEY'] },
  // ...
}
```

`getRequiredEnv(app)` merges `SHARED_REQUIRED` with the app's entry so shared
vars are always validated. `createApp({ apiApp: 'ezauth' })` uses it
automatically. Missing vars throw a clear boot-time error.

## API boot order

`apps/{app}/api/src/instrument.mts` runs FIRST (imported before everything
else from `index.ts`):

```ts
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl, getSentryDsn } from '@ezstart/config/env-resolvers'

loadSharedEnv({ app: 'ezauth', layer: 'api' })
process.env.MONGO_URL = getMongoUrl('ezauth')
const dsn = getSentryDsn('ezauth')
if (dsn) process.env.SENTRY_DSN = dsn

import { initSentry, Sentry } from '@ezstart/logger/server'
const sentry = initSentry('EZAuth API')
```

This guarantees that `JWT_SECRET`, `MONGO_URL`, `SENTRY_DSN` are populated
before Sentry init and before any module that reads them at import time
(e.g. auth middleware).

## Adding a new variable

### Used by every app (shared)

1. Add it (no value) to `.env.example`.
2. Fill the real value in `.env.local` (dev) and on Railway/Vercel (prod).
3. Consume via `process.env.MY_VAR` — no helper needed.

### Used by one app only

Same as above — just document in the per-app `.env.example` doc stub.

### Varies per app via template

1. Add a placeholder like `MY_VAR=foo-{app}-{env}` to `.env.example` and root
   env files.
2. Add a resolver helper in `env-resolvers.ts` + a unit test.
3. Consume via the helper: `const v = getMyVar('ezbill')`.

### Varies per app with unique values (e.g. API keys per project)

1. Define suffixed names: `MY_VAR_EZAUTH=`, `MY_VAR_EZBILL=`, ...
2. Extend `getMyVar(app)` in `env-resolvers.ts` with the same fallback
   pattern as `getSentryDsn`.
3. Declare it in `packages/config/src/secrets-targets.ts` with `suffixed: true`
   so push/pull/audit know how to route it:

```ts
MY_VAR: { apps: ['ezauth', 'ezbill'], layer: 'api', suffixed: true },
```

### Registering new vars with secrets scripts

Every new var must be added to `VAR_TARGETS` in
`packages/config/src/secrets-targets.ts`, otherwise `secrets:push`/`audit`
will log a `[warn] Unknown var, skipping` and silently leave it local-only.
Pick the right shape:

```ts
// Plain per-app var pushed to Railway only
STRIPE_SECRET_KEY: { apps: ['ezpay'], layer: 'api' },

// NEXT_PUBLIC_* exposed on Vercel web project
NEXT_PUBLIC_APP_NAME: { apps: ['green-pulse'], layer: 'web', client: true },

// Shared everywhere
JWT_SECRET: { apps: '*', layer: 'api' },

// Templated — MONGO_URL resolves {app}/{env} before push, also lands on fengshui web
MONGO_URL: { apps: '*', layer: 'api', template: true, webOverrides: ['fengshui'] },

// Suffixed — per-app uniqueness without collisions at the root
SENTRY_DSN: { apps: '*', layer: 'api', suffixed: true },
```

## Production secrets

Never push root `.env.production` anywhere. Production values live in
**Railway** (per-API service) and **Vercel** (per-web-project). The root
`.env.production` file is a LOCAL REFERENCE only — used by `secrets:pull` /
`secrets:audit` to compare against cloud state.

## CLI commands

Scripts live at the monorepo root (`scripts/secrets-{push,pull,audit}.ts`)
and are driven by the declarative `VAR_TARGETS` map in
[`packages/config/src/secrets-targets.ts`](./packages/config/src/secrets-targets.ts).
That single source of truth tells each script, for every var used in
`.env.{local,staging,production}`:

- which apps consume it (`apps: '*'` or `['ezpay']`, etc.)
- which runtime layer needs it (`layer: 'api' | 'web' | 'both'`)
- whether it is templated (`MONGO_URL` with `{app}/{env}`),
  suffixed (`SENTRY_DSN_EZAUTH`), client-exposed (`NEXT_PUBLIC_*`),
  or requires web overrides (e.g. `fengshui` runs DB queries in route handlers
  and therefore needs `MONGO_URL` on Vercel)

All three scripts mask sensitive values (`*_KEY`, `*_SECRET`, `*_TOKEN`,
`*_DSN`, `MONGO_URL`, `JWT_SECRET`) in their output — plaintext never lands on
stdout.

Shared flags:

| Flag             | Effect                                                       |
| ---------------- | ------------------------------------------------------------ |
| `--env <name>`   | `local` / `staging` / `production` (default: `production`)   |
| `--dry-run`      | **DEPRECATED** — alias of `--plan`. Prefer `--plan`.         |
| `--vercel-only`  | Skip Railway                                                 |
| `--railway-only` | Skip Vercel                                                  |
| `--vars K1,K2`   | Restrict to the listed var names (declared in `VAR_TARGETS`) |
| `--strict`       | (audit) exit 1 on any drift                                  |
| `--json`         | (audit / healthcheck / verify) machine-readable output       |
| `--merge`        | (pull) keep local-only keys not present in cloud             |

## Safe push workflow

Pushing production secrets is a destructive operation. Use the Terraform-style
phased workflow below for every production rollout — each phase is gated
by an explicit flag so accidents require intent.

```bash
# Phase 1 — Pre-flight (fully local, no cloud I/O)
pnpm secrets:verify                                      # cross-check mapping ↔ code ↔ .env.example
pnpm secrets:push --env production --preflight          # validate .env.production

# Phase 2 — Plan (diff local vs cloud, no changes applied)
pnpm secrets:push --env production --plan

# Phase 3 — Canary (apply to a single service, then smoke it)
pnpm secrets:push --env production --canary ezbill-api --confirm
pnpm secrets:healthcheck --service ezbill-api

# Phase 4 — Full rollout (--confirm-delete is a SECOND opt-in for DELETE ops)
pnpm secrets:push --env production --confirm --confirm-delete
pnpm secrets:healthcheck --all

# Rollback — push a prior backup verbatim
pnpm secrets:push --env production --from-backup tmp/secrets-pull-backup-<ts>.env.production --confirm --confirm-delete
```

### `pnpm secrets:verify`

Cross-checks three sources: `process.env.X` usage in `apps/<app>/{api,web}/src`,
per-app `.env.example` files, and `VAR_TARGETS`. Categorises every divergence
as `STALE_EXAMPLE`, `MISSING_IN_MAPPING`, `OVER_SCOPED`, or `UNDER_SCOPED`.

```bash
pnpm secrets:verify          # full report (exit 1 on any divergence)
pnpm secrets:verify --fix    # also print a candidate VAR_TARGETS patch (apply manually)
pnpm secrets:verify --json   # machine-readable
```

### `pnpm secrets:healthcheck`

Hits `/api/health` on every API URL from `@ezstart/config`. Exits with the
number of failing services (capped at 125) so CI can block a rollout.

```bash
pnpm secrets:healthcheck                               # all services, production
pnpm secrets:healthcheck --env local
pnpm secrets:healthcheck --service ezbill-api
pnpm secrets:healthcheck --json --timeout 15000
```

### `pnpm secrets:push` (alias: `secrets:sync`)

Pushes root `.env.{env}` → Railway services + Vercel projects. Suffixed vars
are stripped to their base name per target; templated vars are resolved with
the current app/env before push.

Phase flags:

| Flag                   | Effect                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `--preflight`          | Validate `.env.{env}` only (placeholders, missing required, formats, backup freshness). No cloud I/O. |
| `--plan` (default)     | Show ADD / UPDATE / NOOP / DELETE diff vs cloud. Masked values.                                       |
| `--canary <svc>`       | Apply only to the service whose label ends with `/<svc>`.                                             |
| `--confirm`            | Execute ADD + UPDATE ops.                                                                             |
| `--confirm-delete`     | Required IN ADDITION to `--confirm` to execute DELETE ops.                                            |
| `--from-backup <file>` | Read a backup file instead of `.env.{env}` (rollback).                                                |

```bash
pnpm secrets:push --env production                    # implicit --plan
pnpm secrets:push --env production --preflight        # local validation only
pnpm secrets:push --env production --plan             # preview diff
pnpm secrets:push --env production --canary ezbill-api --confirm
pnpm secrets:push --env production --confirm --confirm-delete
pnpm secrets:push --env production --vars JWT_SECRET --confirm
pnpm secrets:push --vercel-only --confirm
```

### `pnpm secrets:pull`

Fetches live vars from every Railway service + Vercel project and reconstructs
the root `.env.{env}` file. Suffixed vars are re-attached (`SENTRY_DSN` on
railway/ezauth-api becomes `SENTRY_DSN_EZAUTH` at root). Templated vars
(`MONGO_URL`) are NOT pulled — the root keeps the template form by design.

A timestamped backup is always written to
`tmp/secrets-pull-backup-<ts>.env.<env>` before overwriting.

```bash
pnpm secrets:pull --env production
pnpm secrets:pull --env production --dry-run
pnpm secrets:pull --env production --merge            # preserve local-only keys
```

### `pnpm secrets:audit`

Compares root `.env.{env}` against the live state. Never mutates anything.

```bash
pnpm secrets:audit --env production
pnpm secrets:audit --env production --strict          # exit 1 on drift
pnpm secrets:audit --env production --json
```

Drift categories:

| Category           | Meaning                                          |
| ------------------ | ------------------------------------------------ |
| `ok`               | Local matches cloud exactly                      |
| `missing_in_cloud` | Local has it; cloud target doesn't → run push    |
| `missing_in_local` | Cloud has it; local doesn't → run pull or ignore |
| `drift`            | Values differ between local and cloud            |

### Vercel scope

Scripts need a team scope to link each project. Set one of these (shell or root
`.env.local`):

```bash
VERCEL_SCOPE=ezstart            # preferred (URL slug — visible at vercel.com/ezstart)
# or VERCEL_TEAM_ID=team_s1KxhxVX5g6qgwpFKvytTdMM (more stable, survives team renames)
```

### `pnpm secret:gen`

Generate a crypto-secure secret for ad-hoc use. Unchanged by the migration.

```bash
pnpm secret:gen           # 64 bytes base64url
pnpm secret:gen 32
pnpm secret:gen --hex
```

### `pnpm rotate-secrets`

Rotates `JWT_SECRET` + `OAUTH_ENCRYPTION_KEY` in root `.env.local` /
`.env.production` and pushes to Railway + Vercel. Uses generic names only.

## Rollback

Git history contains the pre-migration root env files (`.env.shared.example`
template, prefix-aware loader). To revert:

```bash
git log --all --full-history -- .env.shared.example
git restore --source=<sha> --staged --worktree packages/config/src/secrets-loader.ts
# …or simply revert the PR
```

## Workflow summary

```bash
# Bootstrap local env
pnpm setup:env            # copies .env.example → .env.local

# Edit .env.local — replace <DEV_PASSWORD> and other placeholders

# Validate
pnpm validate-env

# Start an app
pnpm dev ez               # EZStart + EZAuth + EZPay
```
