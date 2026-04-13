# Generators — @ezstart Monorepo

Zero-maintenance code generation pipeline. Source-of-truth files (CSS, JSON, SVG, component sources) are committed; derived artifacts are regenerated on demand and never committed.

## Convention

Every package that owns a generator exposes a single entry point:

```json
{
  "scripts": { "generate": "<runner> <script>" }
}
```

Turbo picks it up automatically — no extra wiring per package.

## Current generators

| Package                | Sources                                    | Outputs                                                                            | Auto |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- | ---- |
| `@ezstart/ui`          | `src/styles/**/*.css`, `src/components/**` | `src/styles/**/*.generated.ts`, `apps/ezstart/.../inspector/registry.generated.ts` | yes  |
| `@ezstart/next-config` | `apps/*/web/public/logo.{svg,png,…}`       | `apps/*/web/public/icon-*.png`, `apple-touch-icon.png`, `favicon.png`              | no   |

**Auto = yes** → runs on `postinstall`, `prebuild`, pre-commit, CI drift check.
**Auto = no** → explicit opt-in (`pnpm icons:generate` or `pnpm --filter @ezstart/next-config generate:icons`). Icons are binary, non-deterministic (sharp metadata), and committed — regenerating them every install would cause perpetual git churn. Run manually when the logo source changes.

## Triggers

| When                 | How                                                                         |
| -------------------- | --------------------------------------------------------------------------- |
| After `pnpm install` | `postinstall` runs `turbo run generate` (cached)                            |
| Before builds        | `prebuild` runs `turbo run generate` (cached)                               |
| During dev           | `pnpm dev:packages` watches sources via `turbo watch`                       |
| Pre-commit           | Husky hook runs `pnpm generate` (fails commit if generator errors)          |
| CI                   | `.github/workflows/ci.yml` runs `pnpm generate` then `git diff --exit-code` |

## Adding a new generator

1. In the owning package, add a script that produces files next to their sources:
   ```json
   {
     "scripts": { "generate": "tsx scripts/generate.ts" }
   }
   ```
2. Emit outputs using the `.generated.ts` suffix OR inside a `generated/` folder — both are gitignored globally.
3. If consumers import the output directly, add a tracked stub that re-exports it:
   ```ts
   // foo.ts  (committed)
   export * from './foo.generated'
   ```
4. Extend `turbo.json` inputs/outputs only if your generator uses file extensions not already covered (`.css`, `.json`, `.yaml`, `.svg`, `.ts`, `.tsx`).
5. If outputs are binary or non-deterministic (PNG metadata, sharp, imagemagick…), name the script `generate:<thing>` instead of `generate`. This keeps it out of the auto-pipeline and forces manual opt-in — otherwise CI will loop on drift.

That's it. Turbo discovers the script automatically; `postinstall`, `prebuild`, `dev:packages` and CI pick it up without further edits.

## Commands

```bash
pnpm generate              # Run all generators (cached via turbo)
pnpm generate --force      # Bypass turbo cache
pnpm --filter @ezstart/ui generate           # Single package
pnpm --filter @ezstart/ui generate:themes    # Single step (theme CSS only)
pnpm --filter @ezstart/ui generate:registry  # Single step (UI registry only)
```

## Debugging

| Symptom                                 | Fix                                                                 |
| --------------------------------------- | ------------------------------------------------------------------- |
| `Module not found: './xxx.generated'`   | `pnpm generate` — the output wasn't regenerated yet                 |
| CI fails on "generator outputs drifted" | Run `pnpm generate` locally, commit any stub changes                |
| Turbo cache stuck                       | `turbo run generate --force`                                        |
| `postinstall` fails in a fresh clone    | Run `pnpm install` again; if it recurs, `turbo` cache may be wedged |

## Gitignore rules

```
**/*.generated.ts
**/generated/**
```

If you need to track a generated file, use a different suffix or add an explicit negation (`!path/to/file.generated.ts`).
