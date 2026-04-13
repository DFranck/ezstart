# Secrets & Environment Variables

Centralized architecture for `.env.local` / `.env.production` across the monorepo.
Source of truth: `@ezstart/config/secrets-loader` (TS, used by APIs) and
`@ezstart/next-config/withSharedEnv` (JS, used by Next.js apps).

## Layout

```
@ezstart/
├── .env.shared.example     # Template (committed) — documents all shared vars
├── .env.local              # DEV shared secrets (gitignored)
├── .env.production         # PROD shared secrets (gitignored)
│
└── apps/{app}/{api|web}/
    ├── .env.local          # App-specific overrides (gitignored)
    └── .env.production     # App-specific prod overrides (gitignored)
```

## Loading order

Later files override earlier ones:

1. Monorepo root `.env.{NODE_ENV}` (shared secrets: API keys, SDK tokens, infra CLIs).
2. App-specific `apps/{app}/{layer}/.env.{NODE_ENV}` (DB URL, JWT, OAuth callbacks,
   app-specific test users).

Apps need **no code change** to benefit:

- APIs: `createApp({ apiApp: 'ezbill' })` calls `loadSharedEnv({ app, layer: 'api' })`.
- Web: `createNextConfig({ app: 'ezbill', ... })` calls `loadSharedEnv(app)` before
  Next.js boots. Next.js then loads its own `apps/{app}/web/.env.local` natively.

## What lives where

### Shared (root `.env.local`)

- AI providers: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
- Email: `RESEND_API_KEY`
- Sentry org: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG_SLUG`
- MongoDB Atlas admin: `MONGODB_ATLAS_*`
- Infra CLIs: `VERCEL_TOKEN`, `RAILWAY_TOKEN`, `GITHUB_TOKEN`, `GITHUB_USERNAME`
- External APIs used by 2+ apps: `EXCHANGE_RATE_API_KEY`, etc.

### App-specific (keep per-app)

- `MONGO_URL` — each app has its own database
- `JWT_SECRET` — never share (each app rotates independently)
- `SENTRY_DSN` — project-specific
- `GOOGLE_CLIENT_*`, `OAUTH_*` — callback URLs differ
- `STRIPE_*` — per-app account
- `NEXT_PUBLIC_*` — web-only
- `EMAIL_FROM`, `TEST_USER_*` — per-app
- `*_CALLBACK_URL`, `*_REDIRECT_URI`

## Adding a new shared var

1. Add it (without value) to `.env.shared.example`.
2. Add the real value to root `.env.local` (dev) and to Railway/Vercel prod envs.
3. Consume it with `process.env.MY_VAR` — no import needed.

## Adding a new app-specific var

1. Add it to `apps/{app}/{layer}/.env.example`.
2. Set the value in `apps/{app}/{layer}/.env.local`.
3. If required at boot, declare it in `required`:

```ts
loadSharedEnv({ app: 'ezbill', layer: 'api', required: ['MONGO_URL', 'JWT_SECRET'] })
```

## Validation at boot

`loadSharedEnv({ required: [...] })` throws a clear error listing all missing vars
and where to set them. No more silent `undefined` failures 3 requests in.

## Rollback

If anything breaks:

```bash
# Restore from backup
cp -r tmp/env-backup-<timestamp>/apps/* apps/
```

The loader is **backward compatible**: if root `.env.local` is missing, apps fall
back to their own `.env.local` (same as before).

## Production (Railway / Vercel)

Set all **shared** vars in each service's env (Railway service / Vercel project).
We don't upload root `.env.production` anywhere — platforms store env per service.

## CLI commands

All scripts mask sensitive values (`*_SECRET`, `*_KEY`, `*_TOKEN`, `*_DSN`)
in their output — plaintext is never logged.

### `pnpm setup:env`

Idempotent generator for `.env.local` files.

- Writes/refreshes the **root** `.env.local` with shared vars (`SHARED_VARS` map).
- Writes/refreshes per-app `.env.local` with **only** the app-specific overrides
  (`MONGO_URL`, `JWT_SECRET`, OAuth callbacks, etc.).
- Existing values are preserved unless `--force` is passed.
- Auto-backups every modified file under `tmp/env-backup-<ts>/`.

```bash
pnpm setup:env                # write/update both
pnpm setup:env -- --dry-run   # preview
pnpm setup:env -- --root-only # only root
pnpm setup:env -- --apps-only # only per-app
pnpm setup:env -- --force     # overwrite existing
```

### `pnpm validate-env`

Audits the centralized layout:

1. Root `.env.local` / `.env.production` against `.env.shared.example`.
2. Per-app `.env.{local,production}` against each `apps/{app}/{layer}/.env.example`,
   accepting that vars present in the root file are automatically resolved.
3. Flags **redundant** per-app overrides (same value as root → useless).
4. Flags **promotion candidates** — a var defined identically in 2+ apps that
   could move to root.
5. Rejects real secrets in any `*.example` file.

`--strict` makes warnings exit non-zero (CI mode).

### `pnpm rotate-secrets`

Rotates per-app `JWT_SECRET` (+ `OAUTH_ENCRYPTION_KEY` for ezauth) and pushes
the new prod values to **Railway** and **Vercel** automatically.

```bash
pnpm rotate-secrets                 # dev + prod, push everywhere
pnpm rotate-secrets -- --dev        # only .env.local
pnpm rotate-secrets -- --prod       # only .env.production
pnpm rotate-secrets -- --dry-run    # preview
pnpm rotate-secrets -- --no-railway # skip Railway push
pnpm rotate-secrets -- --no-vercel  # skip Vercel push
```

### `pnpm secrets:sync`

Pushes shared secrets from root `.env.production` to all platforms.
Source of truth = `.env.production` at the monorepo root.

Routing:

- `NEXT_PUBLIC_*` → Vercel only
- Vars in `RAILWAY_SHARED_VARS` (AI keys, Resend, Sentry org, Exchange Rate) → all Railway services
- Vars in `VERCEL_SHARED_VARS` (Sentry org) → all Vercel projects

```bash
pnpm secrets:sync                       # push to all
pnpm secrets:sync -- --vercel-only      # only Vercel
pnpm secrets:sync -- --railway-only     # only Railway
pnpm secrets:sync -- --dry-run          # preview
pnpm secrets:sync -- --vars KEY1,KEY2   # only specific vars
```

### `pnpm secret:gen`

Generate a cryptographically secure secret for ad-hoc use.

```bash
pnpm secret:gen           # 64 bytes base64url
pnpm secret:gen 32        # 32 bytes
pnpm secret:gen --hex     # hex encoding
```
