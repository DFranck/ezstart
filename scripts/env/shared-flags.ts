/**
 * Shared CLI helpers for env push scripts (push-vercel.ts, push-railway.ts,
 * push-all.ts).
 *
 * Two pieces live here :
 *   1. parseEnvArg() — validates that exactly one env target was provided,
 *      whether via positional `<env>` (legacy) OR `--env=<env>` flag (anti-typo).
 *   2. isProtectedEnvKey() — guard for the prune logic. Some env vars are
 *      reserved by the platform (Vercel system vars, Railway internal) and
 *      MUST never be deleted by `--prune`, even when they don't appear in the
 *      local cascade.
 *
 * Why a separate file: zero behavior change to the existing CLI, surfaces are
 * small + tested in isolation, and shared by 3 callers (push-vercel,
 * push-railway, push-all).
 */

export type TargetEnv = 'local' | 'staging' | 'production'

export const ALL_TARGET_ENVS: readonly TargetEnv[] = ['local', 'staging', 'production'] as const

/**
 * Parse the `<env>` target from positional args + `--env=<value>` flag.
 *
 * Rules :
 *   - If neither is set → returns `null` (caller fails with usage message).
 *   - If only positional → returns positional (legacy behavior preserved).
 *   - If only `--env=` → returns the flag value.
 *   - If both → must MATCH. If they conflict, throws (anti-typo safety).
 *   - The chosen value MUST be one of `local | staging | production`,
 *     otherwise throws.
 *
 * Anti-typo safety : `pnpm env:push:vercel ezpay stagging` will fail at the
 * positional validation step. `pnpm env:push:vercel ezpay --env=stagging`
 * fails at the flag validation step. Both produce a clear error citing the
 * 3 valid values.
 *
 * @param positional Raw positional value (process.argv[3]) — may be undefined.
 * @param flagValue  Raw `--env=` flag value — may be undefined when flag
 *                   absent.
 * @returns The validated target env or `null` if neither is provided.
 * @throws Error  When invalid value OR when positional and flag conflict.
 */
export function parseEnvArg(
  positional: string | undefined,
  flagValue: string | undefined
): TargetEnv | null {
  // Both set : must match exactly. Anti-typo safety net.
  if (positional !== undefined && flagValue !== undefined && positional !== flagValue) {
    throw new Error(
      `Conflicting env targets : positional="${positional}" vs --env=${flagValue}.\n` +
        `  Specify one or the other, or pass identical values.`
    )
  }

  const value = positional ?? flagValue
  if (value === undefined) return null

  if (!ALL_TARGET_ENVS.includes(value as TargetEnv)) {
    throw new Error(
      `Invalid env "${value}" — must be one of : ${ALL_TARGET_ENVS.join(' | ')}.\n` +
        `  Hint : check for typos like "stagging", "prod", or "dev".`
    )
  }

  return value as TargetEnv
}

/**
 * Extract `--env=<value>` from a flags array. Mutates `flags` (removes the
 * matching entry) so the caller can keep flag parsing position-independent
 * — call this BEFORE `parseFlags()` so `parseFlags()` doesn't see the flag
 * and complain about an unknown option.
 *
 * Supports both `--env=value` (recommended) and the rarely-used split form
 * `--env value`.
 *
 * @param flags Mutated. Returns the consumed value or undefined.
 */
export function extractEnvFlag(flags: string[]): string | undefined {
  for (let i = 0; i < flags.length; i++) {
    const f = flags[i]
    if (f.startsWith('--env=')) {
      const value = f.slice('--env='.length)
      flags.splice(i, 1)
      return value
    }
    if (f === '--env') {
      const value = flags[i + 1]
      flags.splice(i, 2)
      return value
    }
  }
  return undefined
}

/**
 * Patterns of env vars that the cloud platform manages itself. We MUST never
 * delete these via `--prune` because :
 *   - The platform re-injects them on every deploy (deleting wastes a CLI
 *     call and the var reappears).
 *   - Some internal vars are required for the service to boot (`PORT` on
 *     Railway). Deleting them breaks the deploy.
 *
 * Pattern groups :
 *   - VERCEL_* — Vercel system vars (URL, ENV, GIT_*). Auto-injected.
 *   - RAILWAY_* — Railway system vars (RAILWAY_ENVIRONMENT, RAILWAY_TOKEN
 *                  on the build agent). Some are auto-injected at runtime.
 *   - NX_* — Nx Cloud vars some platforms inject for monorepo CI.
 *   - PORT — Required for Railway services; managed by Railway.
 *   - NODE_ENV — Set by Next.js / Express runtime, do NOT prune.
 *   - CI — Set by build runners.
 *   - Anything starting with `_` — Vercel reserved underscore prefix.
 */
const PROTECTED_PATTERNS: ReadonlyArray<RegExp> = [/^VERCEL_/, /^RAILWAY_/, /^NX_/, /^_/] as const

const PROTECTED_EXACT: ReadonlySet<string> = new Set(['PORT', 'NODE_ENV', 'CI'])

/**
 * Returns true when an env var name is platform-managed and must not be
 * pruned. Used by the `--prune` logic in push-vercel.ts and push-railway.ts
 * to filter the diff between remote and local cascade.
 */
export function isProtectedEnvKey(key: string): boolean {
  if (PROTECTED_EXACT.has(key)) return true
  for (const pattern of PROTECTED_PATTERNS) {
    if (pattern.test(key)) return true
  }
  return false
}
