# Contributing as an External Developer

This guide is for **external contributors** who want to build on top of an `@ezstart` app in isolation, without forking the entire monorepo.

For internal monorepo contributors, see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## When to extract a standalone

Extract an app when you want to:

- Run a single `@ezstart` app locally without the rest of the monorepo
- Customize the app for your own deployment (your branding, your DB, your auth keys)
- Contribute fixes back via PR, with a smaller surface to reason about
- Vendor an app into your own repo (e.g. private fork)

Do NOT extract if you want to contribute to the shared `packages/` (UI kit, SDKs, configs). Packages are best edited inside the monorepo and PRs go to `packages/**` directly. See [Contributing to packages](#contributing-to-packages-back-to-the-monorepo).

---

## Quick start — extract an app

From the monorepo root:

```bash
# Extract green-pulse to a sibling directory
node scripts/generators/extract-app.js green-pulse ../green-pulse-standalone

# Or with named flags
node scripts/generators/extract-app.js --name green-pulse --output ../green-pulse-standalone

# Dry run (see what would be extracted, no files written)
node scripts/generators/extract-app.js green-pulse ../green-pulse-standalone --dry-run

# Help
node scripts/generators/extract-app.js --help
```

The output directory must NOT exist beforehand (the script refuses to overwrite).

### What you get

```
green-pulse-standalone/
├── api/                  # Express + MongoDB API
├── web/                  # Next.js app
├── types/                # Shared types
├── packages/             # All transitive @ezstart/* deps copied as workspace packages
│   ├── api-core/
│   ├── auth-sdk/
│   ├── pay-sdk/
│   ├── ui/
│   └── ...
├── package.json          # Root workspace config (turbo + pnpm)
├── pnpm-workspace.yaml
├── tsconfig.json
├── turbo.json
├── prettier.config.js
├── .gitignore
├── .env.local            # Auto-generated, values copied from monorepo .env.local
├── .env.example          # Auto-generated, empty placeholders for the same keys
└── README.md
```

### First-time setup

```bash
cd ../green-pulse-standalone
pnpm install
pnpm dev
```

---

## Environment configuration (self-contained)

The standalone repo is **self-contained env-wise**: it has NO root `.env.local` fallback like the monorepo does.

### How env extraction works

The generator script:

1. Greps every `process.env.<VAR_NAME>` reference in the app source (`web/src`, `api/src`, `types/src`) AND in every transitive package's `src/`.
2. Reads the monorepo's root `.env.local` (shared vars like `JWT_SECRET`, `MONGO_URL`).
3. Reads the per-app `.env.local` files (`apps/<app>/api/.env.local`, `apps/<app>/web/.env.local`).
4. Merges them — per-app overrides root.
5. Writes a self-contained `.env.local` (with values copied) and `.env.example` (with empty placeholders) into the standalone root.

System vars (`NODE_ENV`, `PORT`, `PATH`, `VERCEL_ENV`, `NEXT_RUNTIME`, etc.) are skipped — they come from the runtime, not user config.

### What you must change after extraction

Copied values are starting points, NOT production secrets. Before running anything beyond local dev:

1. **Rotate `JWT_SECRET`** — the copied value is shared with the monorepo. Generate a new one:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
   ```
2. **Replace `MONGO_URL`** — the copied template uses the monorepo's MongoDB Atlas cluster. Point to your own cluster (and your own database name).
3. **Generate fresh API keys** (`NEXT_PUBLIC_EZAUTH_KEY`, etc.) — copied keys are scoped to the monorepo's deployment and won't work in your environment.
4. **Set vars listed as `# NOT FOUND in monorepo env files`** — these are commented-out hints; uncomment and fill them in if your fork uses those features (Sentry, ESG provider, OAuth, etc.).

### Per-environment env files

Generated `.env.local` is for **local dev only**. For staging/production, set the same keys in your CI/host:

- **Vercel** (web): `vercel env add` or the dashboard
- **Railway** (api): `railway variables` or the dashboard
- Any other host: standard env var injection

The `.env.example` lists every key your fork needs — use it as the source of truth when provisioning a new environment.

---

## Workflow — running the standalone

```bash
# Install (one time, ~3 minutes for first install)
pnpm install

# Optionally enable native build scripts (sharp, esbuild, swc)
pnpm approve-builds

# Dev (runs all sub-projects via turbo)
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build
```

The standalone uses pnpm workspaces + turbo, identical to the monorepo. All `@ezstart/*` deps resolve via `workspace:*` to the bundled `packages/`.

### Tests

If the original app sub-projects had tests, the configs are copied verbatim. Run them with:

```bash
pnpm --filter api-green-pulse test
pnpm --filter web-green-pulse test
```

Test setup (`vitest.config.ts`, `.env.test`) is preserved. Note that `.env.test` is copied if it exists — review and set up `MongoMemoryServer` or a local test DB if the original used one.

---

## Re-importing a standalone

If you've been working on a standalone (extracted via `extract-app.js`) and now want to fold it back into a monorepo clone — for example, to contribute a bug fix or a new feature you prototyped in isolation — use the reverse script:

```bash
# Import a standalone into the monorepo under apps/<name>/
node scripts/generators/insert-app.js <standalone-path> <app-name>

# Dry run first to see what would happen
node scripts/generators/insert-app.js /tmp/my-fork test-imported --dry-run

# Overwrite an existing apps/<name>/ (dangerous — double-check)
node scripts/generators/insert-app.js /tmp/my-fork my-app --force

# Force layer detection for single-layer standalones
node scripts/generators/insert-app.js ./my-web-only my-app --layer web
```

### What the script does

1. **Detects layout** — multi-layer (`web/`, `api/`, `types/` subfolders) vs single-layer (the standalone itself is one layer).
2. **Copies each layer** to `apps/<app-name>/<layer>/`, skipping `node_modules/`, `dist/`, `.next/`, build caches, and all `.env*` files (those are re-integrated separately).
3. **Rewrites every per-layer `package.json`**:
   - `name` becomes `web-<app-name>` / `api-<app-name>` / `@<app-name>/types` (monorepo convention).
   - All `@ezstart/*` deps become `workspace:*`.
   - If the standalone's root `package.json` is named `<old-app>-standalone`, any `@<old-app>/*` deps are renamed to `@<app-name>/*` so cross-layer refs stay consistent.
4. **Diffs env against the monorepo root `.env.local`**:
   - Standalone vars whose value matches root exactly are treated as shared → NOT written per-app.
   - Remaining vars go into `apps/<app-name>/<layer>/.env.local`.
   - A matching `.env.example` is written alongside (same keys, empty values).

### What the script does NOT do (by design)

The reverse script is deliberately conservative on monorepo wiring — these choices are project-specific and the script has no way to guess them safely:

- **Ports** — `packages/config/src/urls.ts` is not modified. Pick free ports manually and add the app to the `AppName` union, `URLS`, and `PROJECT_METADATA` records.
- **Root `tsconfig.json`** — no references added. Add `{ "path": "./apps/<name>/<layer>" }` entries in the `references` array.
- **Root `package.json` dev script** — no `dev:<shortcut>` script added. Add one if you want a convenience shortcut.

The script prints a reminder checklist of these steps at the end.

### After re-importing

```bash
# Still at the monorepo root
pnpm install
pnpm --filter web-<app-name> typecheck
pnpm --filter api-<app-name> typecheck
```

**Rotate every secret in the imported `.env.local` files** — they came from your fork's env and may leak into git history if you forget. `JWT_SECRET`, `MONGO_URL`, `NEXT_PUBLIC_EZAUTH_KEY`, Stripe keys, OAuth client secrets — all of them.

### Round-trip integrity

`extract-app.js` + `insert-app.js` are designed as an idempotent pair. Source trees (`src/**`) are preserved exactly; only `package.json` names and dep versions change.

---

## Contributing to packages (back to the monorepo)

If you find a bug or want to improve a `@ezstart/*` package:

### Option 1 — fix in the standalone first, port to monorepo

1. Edit `packages/<name>/src/...` in your standalone, test locally.
2. Once validated, copy the diff back to `@ezstart/packages/<name>/src/...` in your monorepo clone.
3. Open a PR against `master` of [DFranck/ezstart](https://github.com/DFranck/ezstart):
   - Branch name: `fix/<short-description>` or `feat/<short-description>`
   - Touch ONLY `packages/**` files (no app changes)
   - Follow the standard checklist in [.claude/rules/standard.md](./.claude/rules/standard.md)
   - Include reproduction steps and link to the standalone repro if helpful

### Option 2 — fix directly in a monorepo clone

1. `git clone git@github.com:DFranck/ezstart.git`
2. `pnpm install` at the root
3. Edit `packages/<name>/...`
4. `pnpm typecheck && pnpm test --filter @ezstart/<name>`
5. Open PR as above

### What we accept

- Bug fixes with a failing test that now passes
- New features with tests + README update + JSDoc on public exports
- Doc improvements (clarifications, typos, missing examples)
- Refactors that shrink complexity without changing the public API

### What we don't accept

- Changes that break the standard checklist (`.claude/rules/standard.md`)
- App-specific logic added to a generic package
- New dependencies without justification
- Style-only churn (formatting, prefer-const, etc.) — `pnpm format` handles those

---

## Versioning & releases

Today, packages are not published to npm — they ship as `workspace:*` deps in your standalone. When publishing happens (planned), it will use [changesets](https://github.com/changesets/changesets):

```bash
# In your standalone, after editing a package:
pnpm changeset
# Pick affected packages, write a summary, choose patch/minor/major

# At release time (monorepo only):
pnpm changeset version   # bumps versions, updates changelogs
pnpm changeset publish   # publishes to npm
```

For now, treat your standalone as a vendored copy. To pull upstream improvements, re-extract or manually `git diff` the relevant `packages/<name>/src/` paths.

---

## Common issues

### `pnpm install` fails with "ERR_PNPM_PEER_DEP_ISSUES"

Some packages have strict peer dep requirements. The standalone extracts the same lockfile-free state as the monorepo. If you hit this, run:

```bash
pnpm install --strict-peer-dependencies=false
```

### `pnpm dev` fails with port-in-use

The app's API/Web ports are baked into config. Either kill the conflicting process or override via `PORT=` in `.env.local`.

### Auth doesn't work after extraction

The copied `NEXT_PUBLIC_EZAUTH_KEY` is scoped to the monorepo's EZAuth instance — it won't authenticate against your standalone deployment. You need to:

1. Run your own EZAuth instance (or extract `ezauth` separately)
2. Generate a publishable key via `pnpm --filter api-ezauth seed:self-key`
3. Update `.env.local` in your app standalone

### Sentry errors not appearing in your project

The copied `SENTRY_DSN` points to the monorepo's Sentry org. Replace with your own DSN, or remove the var entirely (Sentry init is no-op without a DSN).

---

## Useful references

- [README.md](./README.md) — monorepo overview
- [CONTRIBUTING.md](./CONTRIBUTING.md) — internal contributor guide
- [SECRETS.md](./SECRETS.md) — env architecture
- [.claude/rules/standard.md](./.claude/rules/standard.md) — package quality checklist
- [scripts/generators/extract-app.js](./scripts/generators/extract-app.js) — extraction script source
- [scripts/generators/insert-app.js](./scripts/generators/insert-app.js) — reverse (re-import) script source

Found a bug in the script? Open an issue at [DFranck/ezstart/issues](https://github.com/DFranck/ezstart/issues) with the command you ran, the error output, and the app you tried to extract.
