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

## Production secrets

Never push root `.env.production` anywhere. Production values live in
**Railway** (per-API service) and **Vercel** (per-web-project). The root
`.env.production` file is a LOCAL REFERENCE only — used by `secrets:pull` /
`secrets:audit` to compare against cloud state.

## CLI commands

⚠️ **Migration note**: `pnpm secrets:sync` / `secrets:pull` / `secrets:audit`
still reference the legacy `{APP}_` prefix convention for Railway/Vercel
interop. They will need a follow-up refactor to align with the generic root
layout. Until then, push/pull cloud secrets manually via the Railway/Vercel
dashboards or CLIs.

All scripts that DO run mask sensitive values (`*_SECRET`, `*_KEY`, `*_TOKEN`,
`*_DSN`) in their output — plaintext is never logged.

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
