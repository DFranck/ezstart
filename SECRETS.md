# Secrets & Environment Variables

**Architecture: root-only, prefixed.** One file at the monorepo root holds
every secret for every app. Per-app vars are disambiguated by a prefix that
the loader strips at boot.

Source of truth:

- `@ezstart/config/secrets-loader` — used by APIs via `createApp({ apiApp, requiredEnv })`
- `@ezstart/next-config/withSharedEnv` — used by Next.js apps

## Layout

```
@ezstart/
├── .env.shared.example     # Template (committed) — documents vars + prefix convention
├── .env.local              # DEV secrets for ALL apps (gitignored)
├── .env.production         # PROD secrets for ALL apps (gitignored)
│
└── apps/{app}/{api|web}/
    └── .env.example        # (optional) App-level docs (committed, no values)
```

**No more `apps/*/{api,web}/.env.local` files.** They were removed during the
2026-04 migration. The loader ignores them by design.

## Prefix convention

Root file contains two kinds of keys:

| Kind        | Naming              | Example                                                            |
| ----------- | ------------------- | ------------------------------------------------------------------ |
| **Shared**  | No prefix           | `OPENAI_API_KEY`, `RESEND_API_KEY`, `JWT_SECRET`, `STRIPE_*`       |
| **Per-app** | `{APP_PREFIX}_NAME` | `EZAUTH_MONGO_URL`, `EZAUTH_GOOGLE_CLIENT_ID`                      |
| Next public | `NEXT_PUBLIC_*`     | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Next convention — no prefix) |

**Rule**: a var is SHARED when its value is the same everywhere (or shared by
design — e.g. `JWT_SECRET` across all apps for SSO interop). It is PER-APP
only when the value genuinely differs per app (`MONGO_URL`, `SENTRY_DSN`) or
when the var is owned by exactly one app.

**Notable shared-by-design vars**:

- `JWT_SECRET` — shared across all apps so SSO tokens minted by ezauth are
  verifiable by every other app without re-keying.
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PUBLISHABLE_KEY` —
  shared between `ezpay` (payments) and `ezstart` (read-only services tab). If
  you ever want a restricted read-only key just for `ezstart`, re-prefix as
  `EZSTART_STRIPE_*` in root.
- `NODE_ENV` — Node defaults it, so never in the `required` manifest.

**Removed**: `EMAIL_FROM` is no longer an env var. Each app hardcodes its
sender in its `email.service.ts` (`'EZAuth <noreply@ezstart.xyz>'`, etc.).

Known app prefixes (kept in sync with `packages/config/src/secrets-loader.ts`):

```
EZAUTH  EZBILL  EZPAY  EZSTART  GREENPULSE
GACHA_ANALYZER  FENGSHUI  ASC_TCD
```

## How the loader works

When the EZBill API boots and calls `loadSharedEnv({ app: 'ezbill', layer: 'api' })`:

1. Opens root `.env.local` (dev) or `.env.production` (prod).
2. For each key:
   - `OPENAI_API_KEY` → shared, exported as-is → `process.env.OPENAI_API_KEY`.
   - `EZBILL_MONGO_URL` → **self** prefix, stripped → `process.env.MONGO_URL`.
   - `EZAUTH_GOOGLE_CLIENT_ID` → **foreign** prefix, **ignored** (no leak).
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → shared (Next convention).
3. Validates any `required: [...]` vars (use **unprefixed** names).

App code keeps reading `process.env.MONGO_URL` — no changes needed in business
logic. Only the root file needs the prefix.

## Required env manifest

All required vars per API live in a **single central file**:
`packages/config/src/env-manifests.ts`.

```ts
export const SHARED_REQUIRED = ['JWT_SECRET']

export const ENV_MANIFESTS = {
  ezauth: { required: ['MONGO_URL', 'OAUTH_STATE_SECRET'] },
  ezbill: { required: ['MONGO_URL'] },
  ezpay: { required: ['MONGO_URL', 'STRIPE_SECRET_KEY'] },
  // ...
}
```

`getRequiredEnv(app)` auto-merges `SHARED_REQUIRED` with the app's entry so
shared vars are always validated. `createApp({ apiApp: 'ezauth' })` looks up
the list — no per-app declaration needed. Missing vars throw a clear boot-time
error pointing to the expected name in root (shared = unprefixed,
per-app = `{PREFIX}_VARNAME`).

Override for edge cases only: `createApp({ apiApp, requiredEnv: [...] })`.

## Load order at API boot

`apps/{app}/api/src/instrument.mts` runs FIRST:

```ts
import { loadSharedEnv } from '@ezstart/config/server'
loadSharedEnv({ app: 'ezbill', layer: 'api' }) // populates process.env
import { initSentry, Sentry } from '@ezstart/logger/server'
// ...
```

Then `index.ts` imports `instrument.mjs` before anything else. This guarantees
that `SENTRY_DSN`, `JWT_SECRET`, `MONGO_URL` are populated before Sentry init
and before any module that reads them at import time (e.g. auth middleware).

## Adding a new shared var

1. Add it (without value) to `.env.shared.example`.
2. Add the real value to root `.env.local` (dev) and to Railway/Vercel
   production envs.
3. Consume it with `process.env.MY_VAR` — no code changes elsewhere.

## Adding a new per-app var

1. Add `{PREFIX}_MY_VAR` to `.env.shared.example` and root `.env.local`.
2. If required at boot, add the **unprefixed** name to the app's entry in
   `packages/config/src/env-manifests.ts`.
3. In code, read `process.env.MY_VAR` (unprefixed — the loader stripped it).

## Production secrets

Never push root `.env.production` anywhere. Production values live in
**Railway** (per-API service) and **Vercel** (per-web-project).

The sync scripts translate between the prefixed root file and the unprefixed
platform env — see below.

## CLI commands

All scripts mask sensitive values (`*_SECRET`, `*_KEY`, `*_TOKEN`, `*_DSN`)
in their output — plaintext is never logged.

### `pnpm secrets:sync`

Pushes root `.env.production` → Railway + Vercel, stripping per-app prefixes
for each matching target and filtering out foreign per-app vars.

```
EZBILL_MONGO_URL=...  →  pushed as MONGO_URL to railway/ezbill-api only
OPENAI_API_KEY=...    →  pushed as OPENAI_API_KEY to every Railway + allow-listed Vercel
EZAUTH_GOOGLE_*       →  NOT pushed to any project except ezauth-api / web-ezauth
```

```bash
pnpm secrets:sync                       # push to all
pnpm secrets:sync -- --vercel-only
pnpm secrets:sync -- --railway-only
pnpm secrets:sync -- --dry-run          # preview (all masked)
pnpm secrets:sync -- --vars KEY1,KEY2   # only specific vars (root names)
```

### `pnpm secrets:pull`

Fetches production vars from every Vercel project + Railway service and writes
the root `.env.production` with the correct prefix per target.

```
ezbill-api has MONGO_URL=...  →  written as EZBILL_MONGO_URL=... at root
Same OPENAI_API_KEY in all services  →  written as OPENAI_API_KEY=... (shared)
Different MONGO_URL in each service   →  written as EZAUTH_MONGO_URL=...,
                                          EZBILL_MONGO_URL=..., etc.
```

```bash
pnpm secrets:pull                    # fetch all, write root .env.production
pnpm secrets:pull -- --dry-run       # preview, no write
pnpm secrets:pull -- --vercel-only
pnpm secrets:pull -- --railway-only
pnpm secrets:pull -- --merge         # keep existing local-only keys
```

A timestamped backup is always written under `tmp/secrets-pull-backup-<ts>.env.production`.

### `pnpm secrets:audit`

Compares root `.env.production` against the current state of Vercel + Railway.
Never modifies anything.

```bash
pnpm secrets:audit                   # full audit
pnpm secrets:audit -- --strict       # exit 1 on drift (CI)
pnpm secrets:audit -- --json
```

### Vercel scope

Scripts need a team scope to link each project. Set one of these (shell or root
`.env.local`):

```bash
VERCEL_SCOPE=dfrancks-projects   # preferred
# or VERCEL_TEAM_SLUG / VERCEL_TEAM_ID
```

### `pnpm secret:gen`

Generate a crypto-secure secret for ad-hoc use.

```bash
pnpm secret:gen           # 64 bytes base64url
pnpm secret:gen 32
pnpm secret:gen --hex
```

## Rollback

Backups of every migration are kept under `tmp/prefix-migration-backup-<ts>/`
(original root + all removed `apps/*/{api,web}/.env.local`).

To restore:

```bash
# Re-copy the pre-migration root env
cp tmp/prefix-migration-backup-<ts>/root.env.local .env.local
cp tmp/prefix-migration-backup-<ts>/root.env.production .env.production

# Re-copy each app-local (names encode the path with `_` separators)
cp tmp/prefix-migration-backup-<ts>/apps_ezbill_api_.env.local apps/ezbill/api/.env.local
# …etc.
```

Revert the loader + `createApp` changes via git.

## Workflow summary

```bash
# Bootstrap: pull current cloud state
pnpm secrets:pull

# Edit root .env.production (add new vars, fix values)

# Audit before pushing
pnpm secrets:audit

# Push to cloud
pnpm secrets:sync

# Confirm no drift
pnpm secrets:audit
```

**Conflict resolution**: if `secrets:pull` flags a conflict (same unprefixed
key, different values across same-prefix targets) or `secrets:audit` flags
DRIFT, the fix is always manual — update the root file, then `secrets:sync`.
