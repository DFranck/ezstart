# Secrets & Environment Variables

**Architecture: HYBRID (root + per-app), GENERIC names (no app prefix).**
Shared vars (must-be-identical) live at the monorepo root; everything else
lives in `apps/<app>/<api|web>/.env.<env>`. Per-app values override root for
duplicate keys.

Source of truth at runtime:

- `@ezstart/config/server` → `loadSharedEnv({ app, layer })` — used by APIs
  via `instrument.mts`. Loads root then per-app, merges into `process.env`.
- `@ezstart/next-config/withSharedEnv` — used by Next.js apps. Auto-detects
  the app name from cwd (`apps/<app>/web`).
- `@ezstart/config/env-resolvers` → `getMongoUrl(app)`, `getJwtSecret()`,
  `getSentryDsn(app)` — helpers that resolve generic root vars to per-app
  values at the call site.

## Layout

```
@ezstart/
├── .env.example         # Root template (committed) — SHARED vars only
├── .env.local           # Root SHARED dev vars (gitignored)
├── .env.staging         # Root SHARED staging vars (gitignored)
├── .env.production      # Root SHARED prod ref (gitignored; cloud is the source)
│
└── apps/<app>/<api|web>/
    ├── .env.example     # Per-app template (committed) — declares what this app reads
    ├── .env.local       # Per-app dev secrets (gitignored)
    ├── .env.staging     # Per-app staging vars (gitignored)
    └── .env.production  # Per-app prod ref (gitignored)
```

`apps/ezauth/api/.env.test` is a separate vitest-only file (loaded directly
by `vitest.config.ts`).

## Load order

1. **Root** `.env.<env>` is loaded first (no override of shell-set vars).
2. **Per-app** `apps/<app>/<layer>/.env.<env>` is loaded second
   (overrides root for duplicate keys).

Both layers populate the same `process.env` namespace. After both are loaded,
`required` vars (if any) are validated — missing vars throw at boot.

## Shared vs per-app — what goes where?

### SHARED (root only — must be identical across apps)

| Var                 | Purpose                              |
| ------------------- | ------------------------------------ |
| `JWT_SECRET`        | SSO token signing — identical key    |
| `MONGO_URL`         | Templated `{app}` placeholder        |
| `SENTRY_AUTH_TOKEN` | Org-level Sentry token (build-time)  |
| `SENTRY_ORG_SLUG`   | Sentry org slug (defaults `ezstart`) |
| `DEPLOY_ENV`        | `local` / `staging` / `production`   |

(`NODE_ENV` is set by Node/runner, never in `.env`.)

### PER-APP API (lives in `apps/<app>/api/.env.<env>`)

- App-specific Sentry DSN (`SENTRY_DSN`)
- Provider credentials (Stripe, Google OAuth, AI providers, Resend, etc.)
- Feature toggles (`PAYMENT_PROVIDER`, `RUN_EXCHANGE_RATES_ON_START`)
- Per-app config (`COOKIE_DOMAIN`, `OAUTH_STATE_SECRET`, `LOG_LEVEL`)

### PER-APP WEB (lives in `apps/<app>/web/.env.<env>`)

- `NEXT_PUBLIC_EZAUTH_KEY` — **different value per web app** (publishable key)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe client (where applicable)
- `NEXT_PUBLIC_API_URL` — for apps with `next.config.js` rewrites
- `NEXT_PUBLIC_DEBUG` — opt-in client debug flag

## Environment selection

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

1. **Templating** — `MONGO_URL=mongodb+srv://.../{app}?...`
   App code calls `getMongoUrl('ezbill')`.
2. **Suffixing** — `SENTRY_DSN_EZAUTH=...` (legacy; preferred form is now
   per-app `SENTRY_DSN` in `apps/<app>/api/.env.local`).
3. **Shared by design** — `JWT_SECRET` lives at the root because every app
   must verify tokens minted by EZAuth.
4. **`NEXT_PUBLIC_*`** — Next.js convention, readable from the client bundle.
   Per-app values go in `apps/<app>/web/.env.local`.

## Helpers (`@ezstart/config/env-resolvers`)

```ts
import { getMongoUrl, getJwtSecret, getSentryDsn } from '@ezstart/config/env-resolvers'

// In apps/{app}/api/src/instrument.mts, BEFORE any other import:
loadSharedEnv({ app: 'ezauth', layer: 'api' }) // loads root + per-app
process.env.MONGO_URL = getMongoUrl('ezauth') // expands {app}
const dsn = getSentryDsn('ezauth') // checks SENTRY_DSN_EZAUTH then SENTRY_DSN
if (dsn) process.env.SENTRY_DSN = dsn

// Everywhere else, read process.env.MONGO_URL / JWT_SECRET directly.
```

## Required env manifest

`packages/config/src/env-manifests.ts` declares required vars per API and
`createApp({ apiApp: 'ezauth' })` validates them at boot. Missing vars throw
a clear error referencing both root and per-app file paths.

## Adding a new variable

### Used by every app (truly shared)

1. Add it to root `.env.example` (no value).
2. Fill the real value in root `.env.local`.
3. Consume via `process.env.MY_VAR`.

### Used by one app

1. Add it to `apps/<app>/<layer>/.env.example` (template).
2. Fill the real value in `apps/<app>/<layer>/.env.local`.
3. Declare in `packages/config/src/secrets-targets.ts` so push/pull scripts
   know how to route it.

## Validator — `pnpm env:validate`

Verifies the hybrid layout:

- Required SHARED vars present in root
- For each shared var, if a per-app file also defines it, value MATCHES root
- Per-app `.env.example` keys with empty placeholders are present in `.env.local`

```bash
pnpm env:validate                # checks .env.local (default)
pnpm env:validate --env=staging  # checks .env.staging
```

Exit code: 0 on success, 1 on drift / missing.

## Push to cloud

### Railway (per-app API services)

```bash
pnpm env:push:railway <app> <env>
# Example:
pnpm env:push:railway ezauth staging
```

Reads root `.env.<env>` + `apps/<app>/api/.env.<env>`, merges (per-app
wins), resolves `{app}` templating, and pushes via `railway variables --set`.

Requires Railway CLI: `npm i -g @railway/cli`.

### Vercel (per-app web projects)

```bash
pnpm env:push:vercel <app> <env>
# Example:
pnpm env:push:vercel ezpay production
```

Reads root + `apps/<app>/web/.env.<env>`, merges, pushes via
`vercel env add` (cwd set to `apps/<app>/web` for project linking).

Requires Vercel CLI: `npm i -g vercel`.

## Production secrets

Never push root `.env.production` anywhere. Production values live in
**Railway** (per-API service) and **Vercel** (per-web-project). The local
`.env.production` files are LOCAL REFERENCE only.

## Legacy `secrets:*` scripts

The pre-migration `secrets:push`/`secrets:pull`/`secrets:audit`/`secrets:verify`
commands are still present but operate on the legacy single-root model.
Prefer the new `env:*` commands for hybrid layout.

```bash
pnpm secrets:audit --env production           # legacy — diff root vs cloud
pnpm secrets:verify                            # legacy — cross-check VAR_TARGETS
pnpm secrets:healthcheck                       # production health pings
```

## Backups

Pre-migration root .env backups live in `tmp/env-backup-root-<timestamp>.env`
(gitignored). To roll back to the pre-hybrid model:

```bash
cp tmp/env-backup-root-<timestamp>.env .env.local
git checkout HEAD -- packages/config/src/secrets-loader.ts packages/next-config/src/withSharedEnv.js
rm -rf apps/*/api/.env.local apps/*/web/.env.local  # CAUTION: removes per-app secrets
```

## Workflow summary

```bash
# Bootstrap local env after fresh clone
cp .env.example .env.local
for d in apps/*/api apps/*/web; do
  [ -f "$d/.env.example" ] && cp "$d/.env.example" "$d/.env.local"
done
# Then edit each .env.local — replace placeholders with real values

# Validate
pnpm env:validate

# Start dev servers
pnpm dev ez               # EZStart + EZAuth + EZPay
```
