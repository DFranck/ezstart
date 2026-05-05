# Secrets & Environment Variables

**Architecture: PER-APP ONLY.** There is no root `.env.*` layer. Every app owns
its full set of env vars in `apps/<app>/<api|web>/.env.<layer>`. Shared values
(e.g. `JWT_SECRET`, `MONGO_URL`) are intentionally duplicated across each app
that needs them — duplication is preferred to a hybrid/root layer because it
keeps per-app deploy artifacts (Railway service, Vercel project) fully
self-contained and trivially auditable.

Source of truth at runtime:

- `@ezstart/config/server` → `loadSharedEnv({ app, layer })` — used by APIs in
  their `instrument.mts`. Loads `apps/<app>/<layer>/.env.<env>` only.
- `@ezstart/next-config/withSharedEnv` — used by Next.js apps. Auto-detects
  the app name from cwd (`apps/<app>/web`).
- `@ezstart/config/env-resolvers` → `getMongoUrl(app)`, `getJwtSecret()` —
  resolvers for templated vars.

## Layout

```
@ezstart/
└── apps/<app>/<api|web>/
    ├── .env.example     # Per-app template (committed) — declares what this app reads
    ├── .env.local       # Per-app dev values (gitignored)
    ├── .env.staging     # Per-app staging overrides (gitignored)
    └── .env.production  # Per-app production overrides (gitignored)
```

`apps/ezauth/api/.env.test` is a separate vitest-only file (loaded directly by
`vitest.config.ts`).

## Cascade — DRY per-app layering

Per-app files follow a **cascade** from lowest to highest precedence. Each
higher layer only needs to hold the values that DIFFER from the previous
layer. Missing layers are silently skipped.

| Target env   | Cascade (lowest → highest)                        |
| ------------ | ------------------------------------------------- |
| `local`      | `.env.local`                                      |
| `staging`    | `.env.local` ← `.env.staging`                     |
| `production` | `.env.local` ← `.env.staging` ← `.env.production` |

**Why production includes staging?** Staging and production share most of
their "non-dev" defaults (cluster URLs pointing at a real Atlas host,
`DEPLOY_ENV=production`, cookie domain on a real TLD, etc.). Keeping those
in `.env.staging` means `.env.production` only holds the true deltas:

- prod MongoDB cluster URL
- `sk_live_*` Stripe keys / live webhook secrets
- prod-only API URLs and Vercel domains

This keeps every env file DRY and the diff between staging and prod trivially
small and reviewable.

## Environment selection

| `DEPLOY_ENV` | `NODE_ENV`   | File loaded       |
| ------------ | ------------ | ----------------- |
| `production` | any          | `.env.production` |
| `staging`    | any          | `.env.staging`    |
| `local`      | any          | `.env.local`      |
| _(unset)_    | `production` | `.env.production` |
| _(unset)_    | _other_      | `.env.local`      |

Railway and Vercel set `DEPLOY_ENV=staging` / `production` explicitly on each
service so runtime ambiguity is impossible.

## What lives where?

### Per-app API (`apps/<app>/api/.env.<env>`)

- Shared values duplicated per-app: `JWT_SECRET`, `MONGO_URL`, `DEPLOY_ENV`,
  `NODE_ENV`
- Provider credentials (Stripe, Google OAuth, AI providers, Resend, etc.)
- Feature toggles (`PAYMENT_PROVIDER`, `RUN_EXCHANGE_RATES_ON_START`, …)
- Per-app config (`COOKIE_DOMAIN`, `OAUTH_STATE_SECRET`, `LOG_LEVEL`)

### Per-app Web (`apps/<app>/web/.env.<env>`)

- `NEXT_PUBLIC_EZAUTH_KEY` — **different value per web app** (publishable key)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — where applicable
- `NEXT_PUBLIC_API_URL` — for apps with `next.config.js` rewrites
- `NEXT_PUBLIC_DEBUG` — opt-in client debug flag
- `NODE_ENV`, `DEPLOY_ENV` — compiled into the client bundle / SSR branches

Web apps do NOT read server secrets like `JWT_SECRET` or `MONGO_URL`.

## Templating helpers (`@ezstart/config/env-resolvers`)

Generic vars like `MONGO_URL=mongodb+srv://.../{app}?...` use `{app}`
templating so one cluster URL covers every API:

```ts
import { getMongoUrl, getJwtSecret } from '@ezstart/config/env-resolvers'

// In apps/{app}/api/src/instrument.mts, BEFORE any other import:
loadSharedEnv({ app: 'ezauth', layer: 'api' })
process.env.MONGO_URL = getMongoUrl('ezauth') // expands {app}
```

## Required env manifest

`packages/config/src/env-manifests.ts` declares required vars per API and
`createApp({ apiApp: 'ezauth' })` validates them at boot. Missing vars throw a
clear error referencing the per-app file paths.

## Adding a new variable

### Used by one app

1. Add it to `apps/<app>/<layer>/.env.example` (template, no value).
2. Fill the real value in `apps/<app>/<layer>/.env.local`.
3. Consume via `process.env.MY_VAR`.

### Shared by multiple apps (duplicated by design)

1. Add it to every consumer app's `apps/<app>/<layer>/.env.example`.
2. Fill the same value in each app's `.env.local`.
3. (Optional) Add it to the `env:validate` cross-app consistency check if
   drift would break interop (like `JWT_SECRET`).

## Validator — `pnpm env:validate`

Verifies per-app env layout:

- Every app declares the vars it consumes in its `.env.example`.
- Shared vars (if declared in the cross-app consistency list) have matching
  values across apps in the target env.
- Per-app `.env.example` keys with empty placeholders are present in `.env.local`.

```bash
pnpm env:validate                # checks .env.local (default)
pnpm env:validate --env=staging  # checks .env.staging
```

Exit code `0` on success, `1` on drift or missing values.

## Push to cloud

### One app at a time

```bash
# Railway (per-API service)
pnpm env:push:railway <app> <env>
pnpm env:push:railway ezauth staging --dry-run
pnpm env:push:railway ezauth staging

# Vercel (per-web project)
pnpm env:push:vercel <app> <env>
pnpm env:push:vercel ezpay production --dry-run
pnpm env:push:vercel ezpay production
```

Both scripts merge the cascade (`.env.local` → `.env.staging` → `.env.production`
for production targets) and push the flattened result. Railway uses
`railway variables --set`; Vercel uses `vercel env add`.

Flags common to both:

| Flag                 | Effect                                                                                                                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------- |
| `--dry-run`          | Print the merged vars without calling the remote CLI.                                                                                                                                                                              |
| `--from <env>`       | Bypass the cascade and load a SINGLE source file.                                                                                                                                                                                  |
| `--override K=V,...` | Apply a final override (wins over every file layer).                                                                                                                                                                               |
| `--env=<env>`        | Anti-typo alias for the positional `<env>`. Accepts `local                                                                                                                                                                         | staging | production`. Conflicts with positional → fails. |
| `--prune`            | After pushing, inventory the remote and DELETE any var that is not in the local cascade (except platform-managed VERCEL*\*/RAILWAY*_/NODE*ENV/PORT/CI/*_). Off by default — opt-in. Combine with `--dry-run` to preview deletions. |

Railway-only: `--include-blocked` to force-push `TEST_*` / `DEBUG_*` /
`_LOCAL_*` / `DEV_*` vars that are otherwise filtered out of production pushes.

```bash
# Anti-typo: this fails fast instead of pushing to the wrong env
pnpm env:push:vercel ezpay --env=stagging      # ❌ Invalid env "stagging"
pnpm env:push:vercel ezpay staging --env=production   # ❌ Conflicting

# Prune dry-run — preview what would be deleted from Vercel
pnpm env:push:vercel ezpay production --dry-run --prune

# Prune for real — push then delete stale remote vars (PROTECTED keys never touched)
pnpm env:push:vercel ezpay production --prune
```

### All apps at once — `env:push:all`

```bash
pnpm env:push:all <env> [--dry-run] [--only-api] [--only-web]
                        [--apps <csv>] [--continue-on-error] [--prune]
pnpm env:push:all --env=<env> ...   # anti-typo alias for the positional

# Examples
pnpm env:push:all staging --dry-run
pnpm env:push:all production --apps ezauth,ezpay
pnpm env:push:all staging --only-web
pnpm env:push:all production --continue-on-error
pnpm env:push:all production --prune --dry-run     # preview prune across every app
pnpm env:push:all --env=staging --prune            # forward --prune to each child push
```

Loops over the 8 monorepo apps and, for each, calls `env:push:railway` (if the
app has an `api/` package) then `env:push:vercel` (if it has a `web/`
package). Fail-fast by default — `--continue-on-error` pushes every app and
reports failures at the end.

Requires both CLIs: `npm i -g @railway/cli vercel`.

## Production secrets

Never treat local `.env.production` files as the source of truth for
production — they are LOCAL REFERENCE only. The live sources are:

- **Railway** — per-API service vars (pushed via `env:push:railway`).
- **Vercel** — per-web project vars (pushed via `env:push:vercel`).

## Pre-merge-to-production checklist

Before merging a feature branch that affects env vars into `master` / a prod
deploy:

- [ ] Every new var is declared in `apps/<app>/<layer>/.env.example`.
- [ ] The same var is filled in `apps/<app>/<layer>/.env.local` (dev works).
- [ ] If the var differs in staging/prod, it is set in `.env.staging` and/or
      `.env.production` at the per-app level.
- [ ] `pnpm env:validate --env=staging` passes (no drift / no missing).
- [ ] `pnpm env:push:all staging --dry-run` shows the expected set of vars per
      app (no surprises, no secret leaking into wrong app).
- [ ] `pnpm env:push:all production --dry-run` idem.
- [ ] Any required migration has been run (or scheduled) against the staging
      DB first.
- [ ] Any required seed has been run on staging (e.g. `seed:self-key`,
      `seed:ezauth-plans`).
- [ ] `pnpm typecheck` and `pnpm test` are green on the branch.
- [ ] After merge, push cascade runs:
      `pnpm env:push:all staging` → deploy staging → smoke test →
      `pnpm env:push:all production` → deploy production.

## Legacy `secrets:*` scripts

The pre-migration `secrets:push` / `secrets:pull` / `secrets:audit` /
`secrets:verify` commands are still present in `package.json` but operate on
the old single-root model. Prefer the new `env:*` commands above. The
`secrets:*` commands will be removed once all call sites have been migrated.

```bash
pnpm secrets:audit --env production           # legacy — diff root vs cloud
pnpm secrets:verify                            # legacy — cross-check VAR_TARGETS
pnpm secrets:healthcheck                       # production health pings
```

## Backups

Pre-migration root `.env.*` backups live in
`tmp/env-backup-root-<timestamp>.env` (gitignored). To roll back to the
pre-per-app model, restore those files and `git restore` the loaders. This is
generally unnecessary — the per-app layout is strictly more explicit.

## Workflow summary

```bash
# Bootstrap local env after a fresh clone
for d in apps/*/api apps/*/web; do
  [ -f "$d/.env.example" ] && [ ! -f "$d/.env.local" ] && cp "$d/.env.example" "$d/.env.local"
done
# Edit each .env.local — replace placeholders with real values

# Validate
pnpm env:validate

# Start dev servers
pnpm dev ez               # EZStart + EZAuth + EZPay

# Push env to cloud (staging first, then prod)
pnpm env:push:all staging --dry-run
pnpm env:push:all staging
# ... deploy + smoke test ...
pnpm env:push:all production --dry-run
pnpm env:push:all production
```
