/**
 * Safety guards around DELETE intent in push-vercel / push-railway scripts.
 *
 * Two distinct guards live here (post-hacker-A3, 2026-06-05):
 *
 *   1. `requireConfirmOverrideEmptyDelete()` — guards against accidental
 *      `--override KEY=` (empty value) typos that would silently DELETE a
 *      production secret. The flag form `--override` is shell-quoting prone:
 *      a copy-paste that drops the value yields `--override KEY=` which
 *      previously triggered DELETE with zero confirmation. The guard forces
 *      explicit `--yes-i-mean-delete` in non-TTY (scripted / CI) contexts
 *      and prompts interactively in TTY contexts (unless `--non-interactive`
 *      is set, in which case the same explicit-flag requirement applies).
 *
 *   2. `detectInlineCommentEmptyValues()` — heuristic warn when a raw env
 *      file line matches `^KEY=#`. dotenv treats inline `#comment` after `=`
 *      as a comment, returning the value as `''`. An operator adding
 *      `DATABASE_URL=#TODO put real URL` to remember a follow-up actually
 *      triggers DELETE silently. The guard reads the raw file bytes (in
 *      addition to dotenv parse) and warns on the pattern. Non-blocking —
 *      operator is told they may have meant something else.
 *
 * Both guards are exported as pure functions for trivial unit-test coverage.
 * The TTY check is injected (default `process.stdin.isTTY`) so tests can
 * exercise both branches without spawning a fake terminal.
 *
 * @see scripts/env/__tests__/push-empty-delete.test.ts
 */

import { readFileSync, existsSync } from 'node:fs'

export interface OverrideEmptyDeleteOptions {
  /** Keys with empty value, scanned from `--override KEY=` parsed map. */
  emptyOverrideKeys: readonly string[]
  /** `--yes-i-mean-delete` flag present. */
  yesIMeanDelete: boolean
  /** `--non-interactive` flag present (CI / scripted). */
  nonInteractive: boolean
  /** Whether stdin is a TTY. Inject for tests. Default: `process.stdin.isTTY`. */
  isTTY?: boolean
}

export interface OverrideEmptyDeleteResult {
  /** True when the push may proceed. */
  proceed: boolean
  /** Human-readable reason when `proceed === false`. */
  reason?: string
  /** When TTY-interactive prompt is required. Caller handles the prompt. */
  requiresInteractivePrompt: boolean
}

/**
 * Decide whether a push containing `--override KEY=` (empty value) may
 * proceed without further user input.
 *
 * Rules:
 *   - Zero empty override keys → proceed unconditionally.
 *   - `--yes-i-mean-delete` present → proceed (operator opted in explicitly).
 *   - Non-TTY (CI, scripted) AND no `--yes-i-mean-delete` → BLOCK. Require the
 *     flag — silent DELETE in unattended runs is too dangerous. Same applies
 *     when `--non-interactive` is set even from a TTY.
 *   - TTY AND interactive → ask caller to prompt interactively.
 */
export function requireConfirmOverrideEmptyDelete(
  opts: OverrideEmptyDeleteOptions
): OverrideEmptyDeleteResult {
  const empty = opts.emptyOverrideKeys
  if (empty.length === 0) {
    return { proceed: true, requiresInteractivePrompt: false }
  }
  if (opts.yesIMeanDelete) {
    return { proceed: true, requiresInteractivePrompt: false }
  }
  const isTTY = opts.isTTY ?? Boolean(process.stdin.isTTY)
  if (!isTTY || opts.nonInteractive) {
    return {
      proceed: false,
      requiresInteractivePrompt: false,
      reason:
        `--override flag includes empty-value DELETE intent for ${empty.length} key(s): ${empty.join(', ')}\n` +
        `  In non-interactive contexts, you MUST pass --yes-i-mean-delete to confirm.\n` +
        `  This guard exists because a copy-paste typo (\`--override SECRET=\` with no value) would otherwise\n` +
        `  silently delete the secret on the remote. If you really mean to delete, re-run with --yes-i-mean-delete.`,
    }
  }
  return { proceed: false, requiresInteractivePrompt: true }
}

/**
 * Format a confirmation prompt message for the empty-override case. Caller
 * passes the result of this to `readline.createInterface()`.
 */
export function formatOverrideEmptyDeletePrompt(keys: readonly string[]): string {
  return (
    `\n⚠️  --override flagged ${keys.length} key(s) for DELETE (empty value):\n` +
    keys.map(k => `     - ${k}`).join('\n') +
    `\n   Proceed with DELETE? (yes/NO): `
  )
}

export interface InlineCommentEmptyDetection {
  file: string
  line: number
  key: string
  /** Raw text of the offending line (trimmed). */
  raw: string
}

const INLINE_COMMENT_PATTERN = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*#/i

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
