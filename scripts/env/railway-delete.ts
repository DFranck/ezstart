/**
 * Railway CLI per-key delete helper.
 *
 * Why this file exists (post-hacker-A3, 2026-06-05):
 *
 * Railway CLI 4.x does NOT support a batch `variables --remove KEY1 KEY2 ...`
 * subcommand. The previous push-railway.ts implementation called that ghost
 * API and failed systematically when at least one cascade var was empty (the
 * empty=DELETE feature shipped in PUSH-VERCEL-EMPTY-AS-DELETE-001 was broken
 * on Railway out of the gate).
 *
 * The correct CLI 4.x API is `railway variable delete <KEY>` (subcommand
 * `delete`, singular `variable`, **ONE key per call**). This module wraps
 * that surface in a reusable per-key loop with:
 *   - Per-key error capture (continue on partial failure, report at end)
 *   - Idempotent treatment of "not found" stderr (var already absent = OK)
 *   - Total exit code: non-zero iff at least one delete legitimately failed
 *
 * Tested empirically against `railway --version` = 4.35.0 on Windows. The
 * `variable delete` subcommand does NOT accept `--yes` (no confirmation
 * prompt by default per `railway variable delete --help`), and does NOT
 * accept `--skip-deploys` (delete is variable-only, no deploy trigger).
 *
 * @see scripts/env/__tests__/push-empty-delete.test.ts  per-key delete tests
 * @see scripts/env/__tests__/cli-smoke.test.ts          API drift smoke test
 */

export interface PerKeyDeleteResult {
  key: string
  status: number
  stderr: string
  /** True when stderr indicates the var was already absent (idempotent OK). */
  idempotent: boolean
}

export interface DeleteRailwayKeysOptions {
  keys: readonly string[]
  service: string
  env: string
  /** Test seam — defaults to the real `railway` spawn. */
  exec: (args: string[]) => { status: number; stdout: string; stderr: string }
}

/**
 * Delete a list of Railway variables, one CLI call per key.
 *
 * Subcommand executed (per key):
 *   railway variable delete <KEY> --service <s> --environment <e>
 *
 * Continues on per-key failure (collects errors). Returns a structured result
 * the caller uses to decide the process exit code. Per-key failures with
 * stderr matching the "not found" patterns are treated as idempotent success
 * (the var is already absent — the desired end state is met).
 *
 * Why NOT abort on first failure: an operator pushing a large cascade with
 * one bad key shouldn't see all the other deletes skipped. We attempt every
 * delete, then surface what failed at the end. This matches the Vercel
 * per-key behavior in push-vercel.ts (`runWithConcurrency` returns ALL
 * results, success and failure both, the main() handles aggregation).
 */
export function deleteRailwayKeys(opts: DeleteRailwayKeysOptions): {
  results: PerKeyDeleteResult[]
  deleted: number
  idempotent: number
  failed: number
} {
  const results: PerKeyDeleteResult[] = []
  let deleted = 0
  let idempotent = 0
  let failed = 0

  for (const key of opts.keys) {
    const result = opts.exec([
      'variable',
      'delete',
      key,
      '--service',
      opts.service,
      '--environment',
      opts.env,
    ])

    if (result.status === 0) {
      results.push({ key, status: 0, stderr: result.stderr, idempotent: false })
      deleted++
      continue
    }

    // Non-zero exit: check if stderr signals "already absent" (idempotent OK).
    const lowerStderr = result.stderr.toLowerCase()
    const isAlreadyAbsent =
      lowerStderr.includes('not found') ||
      lowerStderr.includes('does not exist') ||
      lowerStderr.includes("doesn't exist")

    if (isAlreadyAbsent) {
      results.push({ key, status: 0, stderr: result.stderr, idempotent: true })
      idempotent++
    } else {
      results.push({ key, status: result.status, stderr: result.stderr, idempotent: false })
      failed++
    }
  }

  return { results, deleted, idempotent, failed }
}
