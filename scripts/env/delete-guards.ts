/**
 * Safety guards around DELETE intent in push-vercel / push-railway scripts.
 *
 * Three distinct guards live here (post-hacker-A3 + A3.5, 2026-06-05):
 *
 *   1. `requireConfirmEmptyDelete()` — guards against accidental empty-value
 *      DELETE intent, whether sourced from `--override KEY=` (flag form) OR
 *      from a cascade file (`KEY=` line in `.env.production` etc.). Both
 *      surfaces are equally risky: a copy-paste typo OR a committed bare
 *      `KEY=` line silently DELETEs production secrets. The guard forces
 *      explicit `--yes-i-mean-delete` in non-TTY (scripted / CI) contexts
 *      and prompts interactively in TTY contexts (unless `--non-interactive`
 *      is set, in which case the same explicit-flag requirement applies).
 *      (Post hacker-A3.5 — P1a fix: extended from override-only to ALL empty
 *      DELETE intent regardless of source.)
 *
 *   2. `detectInlineCommentEmptyValues()` — heuristic warn when a raw env
 *      file line matches `^KEY=#`. dotenv treats inline `#comment` after `=`
 *      as a comment, returning the value as `''`. An operator adding
 *      `DATABASE_URL=#TODO put real URL` to remember a follow-up actually
 *      triggers DELETE silently. The guard reads the raw file bytes (in
 *      addition to dotenv parse) and warns on the pattern. Non-blocking —
 *      operator is told they may have meant something else.
 *
 *   3. `assertNoFailedDeletes()` — helper that aggregates per-key delete
 *      results and triggers `process.exit(1)` when at least one delete
 *      legitimately failed (not counting idempotent "already absent" OKs).
 *      Centralizes the silent-partial-failure check so both push-vercel
 *      (upsert + delete + prune branches) and push-railway (delete + prune
 *      branches) emit a non-zero exit code on partial failure.
 *      (Post hacker-A3.5 — P0 fix: prune branches previously logged the
 *      error then fell through to a zero exit, masking partial deletes.)
 *
 * Both guards are exported as pure functions for trivial unit-test coverage.
 * The TTY check is injected (default `process.stdin.isTTY`) so tests can
 * exercise both branches without spawning a fake terminal.
 *
 * @see scripts/env/__tests__/push-empty-delete.test.ts
 * @see scripts/env/__tests__/delete-guards.test.ts
 */

import { readFileSync, existsSync } from 'node:fs'

export interface EmptyDeleteOptions {
  /** Keys with empty value sourced from `--override KEY=` parsed map. */
  emptyOverrideKeys: readonly string[]
  /**
   * Keys with empty value sourced from a cascade file (`.env.local`,
   * `.env.staging`, `.env.production`). Includes keys whose final merged
   * value is empty after override application (the override side is the
   * authoritative DELETE intent). Typically the caller passes the union of
   * file-sourced empties; the helper de-dupes against `emptyOverrideKeys`.
   */
  emptyCascadeKeys?: readonly string[]
  /** `--yes-i-mean-delete` flag present. */
  yesIMeanDelete: boolean
  /** `--non-interactive` flag present (CI / scripted). */
  nonInteractive: boolean
  /** Whether stdin is a TTY. Inject for tests. Default: `process.stdin.isTTY`. */
  isTTY?: boolean
}

export interface EmptyDeleteResult {
  /** True when the push may proceed. */
  proceed: boolean
  /** Human-readable reason when `proceed === false`. */
  reason?: string
  /** When TTY-interactive prompt is required. Caller handles the prompt. */
  requiresInteractivePrompt: boolean
  /**
   * All keys flagged for DELETE (union of override + cascade, de-duped).
   * Useful for the caller to format the interactive prompt.
   */
  allEmptyKeys: readonly string[]
}

/**
 * Decide whether a push containing empty-value DELETE intent (from either
 * `--override KEY=` or a cascade-file `KEY=`) may proceed without further
 * user input.
 *
 * Rules:
 *   - Zero empty keys (override + cascade union) → proceed unconditionally.
 *   - `--yes-i-mean-delete` present → proceed (operator opted in explicitly).
 *   - Non-TTY (CI, scripted) AND no `--yes-i-mean-delete` → BLOCK. Require the
 *     flag — silent DELETE in unattended runs is too dangerous. Same applies
 *     when `--non-interactive` is set even from a TTY.
 *   - TTY AND interactive → ask caller to prompt interactively.
 *
 * Post hacker-A3.5 (P1a): previously this only fired on override-sourced
 * empties, missing the equivalent risk class of a committed bare `KEY=` line
 * in a cascade file. The N1 inline-comment guard only catches the specific
 * `KEY=#text` pattern — a bare `KEY=` slipped through entirely. Now both
 * surfaces gate identically.
 */
export function requireConfirmEmptyDelete(opts: EmptyDeleteOptions): EmptyDeleteResult {
  const seen = new Set<string>()
  const allEmptyKeys: string[] = []
  for (const k of opts.emptyOverrideKeys) {
    if (!seen.has(k)) {
      seen.add(k)
      allEmptyKeys.push(k)
    }
  }
  for (const k of opts.emptyCascadeKeys ?? []) {
    if (!seen.has(k)) {
      seen.add(k)
      allEmptyKeys.push(k)
    }
  }

  if (allEmptyKeys.length === 0) {
    return { proceed: true, requiresInteractivePrompt: false, allEmptyKeys }
  }
  if (opts.yesIMeanDelete) {
    return { proceed: true, requiresInteractivePrompt: false, allEmptyKeys }
  }
  const isTTY = opts.isTTY ?? Boolean(process.stdin.isTTY)
  if (!isTTY || opts.nonInteractive) {
    const overrideCount = opts.emptyOverrideKeys.length
    const cascadeCount = (opts.emptyCascadeKeys ?? []).filter(
      k => !opts.emptyOverrideKeys.includes(k)
    ).length
    const sources: string[] = []
    if (overrideCount > 0) sources.push(`${overrideCount} via --override`)
    if (cascadeCount > 0) sources.push(`${cascadeCount} in cascade file(s)`)
    const sourceSummary = sources.join(' + ')
    return {
      proceed: false,
      requiresInteractivePrompt: false,
      allEmptyKeys,
      reason:
        `Push includes empty-value DELETE intent for ${allEmptyKeys.length} key(s) (${sourceSummary}): ${allEmptyKeys.join(', ')}\n` +
        `  In non-interactive contexts, you MUST pass --yes-i-mean-delete to confirm.\n` +
        `  This guard exists because a copy-paste typo (\`--override SECRET=\`) OR a committed bare\n` +
        `  \`SECRET=\` line in .env.production would otherwise silently delete the secret on the remote.\n` +
        `  If you really mean to delete, re-run with --yes-i-mean-delete.`,
    }
  }
  return { proceed: false, requiresInteractivePrompt: true, allEmptyKeys }
}

/**
 * @deprecated Use `requireConfirmEmptyDelete()` instead. Kept as a thin
 *   wrapper for backwards compat with tests written against the
 *   override-only surface; new callers should pass both override + cascade
 *   empty keys to the unified guard.
 */
export function requireConfirmOverrideEmptyDelete(opts: {
  emptyOverrideKeys: readonly string[]
  yesIMeanDelete: boolean
  nonInteractive: boolean
  isTTY?: boolean
}): {
  proceed: boolean
  reason?: string
  requiresInteractivePrompt: boolean
} {
  const result = requireConfirmEmptyDelete(opts)
  return {
    proceed: result.proceed,
    reason: result.reason,
    requiresInteractivePrompt: result.requiresInteractivePrompt,
  }
}

/**
 * Format a confirmation prompt message for the empty-delete case. Caller
 * passes the result of this to `readline.createInterface()`.
 */
export function formatEmptyDeletePrompt(keys: readonly string[]): string {
  return (
    `\n⚠️  ${keys.length} key(s) flagged for DELETE (empty value, from --override OR cascade file):\n` +
    keys.map(k => `     - ${k}`).join('\n') +
    `\n   Proceed with DELETE? (yes/NO): `
  )
}

/**
 * @deprecated Use `formatEmptyDeletePrompt()` instead. Kept for backwards
 *   compat with callers still on the override-only surface.
 */
export function formatOverrideEmptyDeletePrompt(keys: readonly string[]): string {
  return formatEmptyDeletePrompt(keys)
}

// ────────────────────────────────────────────────────────────
// Partial-failure aggregation (P0 — post hacker-A3.5)
// ────────────────────────────────────────────────────────────

export interface DeleteFailureRecord {
  key: string
  status: number
  stderr: string
}

/**
 * Assert that no per-key delete failed. When at least one failure is
 * present, log the per-key error breakdown and call `process.exit(1)`.
 *
 * Centralizes the silent-partial-failure check that the prune branches
 * of push-vercel and push-railway both forgot in the initial A3.5 commit.
 * The empty=DELETE branch already had this check inline; the prune branch
 * did not, so a `--prune` run with N failed deletes would log the error
 * then exit 0 (CI marks success while the remote keeps secrets that the
 * cascade said should be gone).
 *
 * @param failures  Array of per-key failure records (status != 0,
 *                  NOT idempotent-OK). Empty array → no-op.
 * @param label     Human label (e.g. `[prune]`, `[delete]`) prepended to
 *                  the error message.
 * @param totalAttempted  Total keys attempted (for the `N/M failed` message).
 * @param onExit    Hook used by tests to capture exit intent without
 *                  killing the test runner. Default: `process.exit`.
 */
export function assertNoFailedDeletes(args: {
  failures: readonly DeleteFailureRecord[]
  label: string
  totalAttempted: number
  onExit?: (code: number) => never
}): void {
  if (args.failures.length === 0) return
  const exit = args.onExit ?? ((code: number) => process.exit(code))
  console.error(`\n❌ ${args.label} ${args.failures.length}/${args.totalAttempted} deletes failed:`)
  for (const f of args.failures) {
    console.error(`     ↳ ${f.key} (status ${f.status}): ${f.stderr.trim().slice(0, 200)}`)
  }
  exit(1)
}

export interface InlineCommentEmptyDetection {
  file: string
  line: number
  key: string
  /** Raw text of the offending line (trimmed). */
  raw: string
}

/**
 * Match `KEY=#...` lines where dotenv interprets `#` as start of an inline
 * comment, parsing the value as `''` (DELETE intent downstream).
 *
 * First char class is `[A-Za-z0-9_]` — permissive on purpose. POSIX strictly
 * disallows env vars starting with a digit, but dotenv + Node `process.env`
 * accept them, and Vercel CLI allows them. Better to over-detect (warn on a
 * key that's technically illegal POSIX) than miss a real DELETE-intent typo.
 *
 * Post hacker-A3.5 (P1c): regex previously required `[A-Z_]` first char,
 * silently missing `2_INTERNAL=#TODO`, `_2KEY=#x` and similar exotic shapes
 * that nonetheless flow through dotenv → push as empty-value DELETE.
 */
const INLINE_COMMENT_PATTERN = /^\s*(?:export\s+)?([A-Za-z0-9_][A-Za-z0-9_.\-]*)\s*=\s*#/

/**
 * Scan raw bytes of an env file for lines matching `KEY=#...`. dotenv parses
 * those as `{ KEY: '' }` (the `#` starts an inline comment), which then
 * triggers DELETE intent downstream — usually NOT what the operator meant.
 *
 * Pure function, no I/O — accept the file content as a string for trivial
 * test coverage. The caller is responsible for reading the file (or NOT,
 * if the file does not exist).
 *
 * @param fileLabel  Path or label for the file (used in the result).
 * @param content    Raw UTF-8 content of the env file.
 * @returns          Array of detections. Empty array = no inline-comment pattern.
 */
export function detectInlineCommentEmptyValues(
  fileLabel: string,
  content: string
): InlineCommentEmptyDetection[] {
  const out: InlineCommentEmptyDetection[] = []
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(INLINE_COMMENT_PATTERN)
    if (!m) continue
    out.push({
      file: fileLabel,
      line: i + 1,
      key: m[1],
      raw: line.trim(),
    })
  }
  return out
}

/**
 * Convenience: scan an env file from the filesystem (best-effort, no throw).
 * Returns empty array if the file does not exist or cannot be read.
 */
export function detectInlineCommentEmptyValuesFromFile(
  absPath: string
): InlineCommentEmptyDetection[] {
  try {
    if (!existsSync(absPath)) return []
    const content = readFileSync(absPath, 'utf-8')
    return detectInlineCommentEmptyValues(absPath, content)
  } catch {
    return []
  }
}
